/**
 * "Заинтересиран" counter for city events (Случувања).
 *
 * Events live in Sanity; this only tracks interest counts in Supabase
 * (`event_interest` table — see supabase/add_event_interest.sql).
 *
 * Hybrid identity: a logged-in user is deduped by user_id, an anonymous
 * visitor by a client-generated visitor_id. All access goes through the
 * service-role admin client here — the table has RLS on with no public
 * policies, so the client can never read/write it directly.
 *
 *   GET  → { counts: { [eventId]: number } }   (edge-cached; fail-soft to {})
 *   POST { eventId, action: "add"|"remove", visitorId } → { eventId, count }
 */

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "../../../../lib/supabase/server";
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
  // fallback. At least one must be present to key a row.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    } else {
      // remove
      if (user) {
        await admin
          .from("event_interest")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);
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
