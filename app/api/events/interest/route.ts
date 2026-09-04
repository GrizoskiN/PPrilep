/**
 * "Заинтересиран" counter for city events (Случувања).
 *
 * Events live in Sanity; this only tracks interest counts in Supabase
 * (`event_interest` table — see supabase/add_event_interest.sql).
 *
 * Hybrid identity: a logged-in user is deduped by user_id, an anonymous
 * visitor by a client-generated visitor_id. All access goes through the
 * service-role admin client here — the table has RLS on with no public
 * policies, so the client can never read/write it directly. Serves both the
 * website (cookie session) and the mobile app (Bearer token).
 *
 *   GET  → { counts: { [eventId]: number } }   (edge-cached; fail-soft to {})
 *   POST { eventId, action: "add"|"remove", visitorId } → { eventId, count }
 */

import { NextResponse } from "next/server";
import { getRequestUser } from "../../../../lib/supabase/request-user";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Counts change on every click but are pure social proof — a short shared edge
// cache keeps origin cost near zero while staying fresh enough.
const GET_CACHE = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" };

// Count interest rows grouped by event. Returns {} on any error (e.g. the table
// doesn't exist yet) so the UI degrades to "no number" instead of breaking.
export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("event_interest").select("event_id");
    if (error) return NextResponse.json({ counts: {} }, { headers: GET_CACHE });

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = (row as { event_id: string }).event_id;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return NextResponse.json({ counts }, { headers: GET_CACHE });
  } catch {
    return NextResponse.json({ counts: {} }, { headers: GET_CACHE });
  }
}

/**
 * Couple interest → reminder for a signed-in user, across ALL their devices.
 *
 * The mobile app registers a per-device reminder when you tap "Заинтересиран",
 * but a tap on the WEBSITE has no device token of its own. So for a logged-in
 * user we fan the reminder out to every Expo push token they've registered
 * (push_subscriptions): mark interest on the web at your desk, get the push on
 * your phone. Upsert on (event_id, expo_token) makes it idempotent and dedupes
 * against the token the mobile app may have already opted in with.
 *
 * Best-effort: a failure here must never fail the interest click itself, so the
 * caller runs it un-awaited-for-correctness (errors are swallowed and logged).
 */
async function syncUserReminders(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  eventId: string,
  action: "add" | "remove",
): Promise<void> {
  try {
    if (action === "remove") {
      await admin
        .from("event_reminders")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", userId);
      return;
    }

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("expo_token")
      .eq("user_id", userId)
      .eq("enabled", true);

    const tokens = (subs ?? [])
      .map((s) => (s as { expo_token: string }).expo_token)
      .filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));
    if (tokens.length === 0) return;

    await admin.from("event_reminders").upsert(
      tokens.map((expo_token) => ({ event_id: eventId, expo_token, user_id: userId })),
      { onConflict: "event_id,expo_token" },
    );
  } catch (e) {
    console.error("[events/interest] reminder sync", e);
  }
}

async function countFor(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
): Promise<number> {
  const { count } = await admin
    .from("event_interest")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  return count ?? 0;
}

export async function POST(req: Request) {
  let body: { eventId?: unknown; action?: unknown; visitorId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
  const action = body.action === "remove" ? "remove" : "add";
  const visitorId =
    typeof body.visitorId === "string" ? body.visitorId.trim().slice(0, 100) : "";

  if (!eventId || eventId.length > 100) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Logged-in user (if any) is the primary identity; visitorId is the anon
  // fallback. At least one must be present to key a row. Accepts the web cookie
  // session OR a mobile Bearer token — the native app has no cookies.
  const user = await getRequestUser(req);

  if (!user && !visitorId) {
    return NextResponse.json({ error: "No identity" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    if (action === "add") {
      // Plain insert (not upsert): the partial unique indexes can't be used as
      // an ON CONFLICT arbiter, so we insert and swallow the unique-violation
      // (23505) that a re-click produces — the index still enforces one row.
      const row = user
        ? { event_id: eventId, user_id: user.id }
        : { event_id: eventId, visitor_id: visitorId };
      const { error } = await admin.from("event_interest").insert(row);
      if (error && error.code !== "23505") throw error;

      // If a logged-in user also clicked while anonymous, fold that row in so
      // they aren't counted twice.
      if (user && visitorId) {
        await admin
          .from("event_interest")
          .delete()
          .eq("event_id", eventId)
          .eq("visitor_id", visitorId);
      }

      // Signed in → also opt every one of their devices into the reminder, so a
      // web click still pushes to their phone.
      if (user) await syncUserReminders(admin, user.id, eventId, "add");
    } else {
      // remove
      if (user) {
        await admin
          .from("event_interest")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);
        await syncUserReminders(admin, user.id, eventId, "remove");
      }
      if (visitorId) {
        await admin
          .from("event_interest")
          .delete()
          .eq("event_id", eventId)
          .eq("visitor_id", visitorId);
      }
    }

    const count = await countFor(admin, eventId);
    return NextResponse.json({ eventId, count });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
