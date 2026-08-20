/**
 * Single-choice poll voting for city events (Случувања).
 *
 * The poll itself (question + options) is authored on the Sanity cityEvent
 * document; this route only records votes in Supabase (`event_poll_votes` — see
 * supabase/add_event_poll.sql), keyed by the Sanity `_id` (eventId) and the
 * chosen option's Sanity array `_key` (optionKey).
 *
 * Hybrid identity, exactly like /api/events/interest: a logged-in user is
 * deduped by user_id, an anonymous visitor by a client visitor_id. The table
 * has RLS on with no public policies, so all access is via the service-role
 * admin client here. Serves the website (cookie session) and the app (Bearer).
 *
 *   GET  ?eventId=…  → { tallies: { [optionKey]: number }, total }
 *   POST { eventId, optionKey, action: "vote"|"remove", visitorId }
 *        → { eventId, tallies, total, mine }   (mine = your optionKey or null)
 */

import { NextResponse } from "next/server";
import { getRequestUser } from "../../../../lib/supabase/request-user";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// A vote must show up the instant the voter refreshes, so tallies are NOT
// shared-cached — a stale CDN copy would read back as "no vote" right after
// voting (which is exactly what it did). Polls are low-traffic; correctness
// beats the tiny egress saving here. (Interest counts tolerate a short cache
// because they never need to reflect the reader's own action on reload.)
const GET_CACHE = { "Cache-Control": "no-store" };

type Admin = ReturnType<typeof createAdminClient>;

/** Count votes per option for one event. Fail-soft to an empty tally. */
async function talliesFor(admin: Admin, eventId: string) {
  const { data, error } = await admin
    .from("event_poll_votes")
    .select("option_key")
    .eq("event_id", eventId);
  if (error || !data) return { tallies: {} as Record<string, number>, total: 0 };

  const tallies: Record<string, number> = {};
  for (const row of data) {
    const key = (row as { option_key: string }).option_key;
    tallies[key] = (tallies[key] ?? 0) + 1;
  }
  return { tallies, total: data.length };
}

export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("eventId")?.trim() ?? "";
  if (!eventId || eventId.length > 100) {
    return NextResponse.json({ tallies: {}, total: 0 }, { headers: GET_CACHE });
  }
  try {
    const admin = createAdminClient();
    const t = await talliesFor(admin, eventId);
    return NextResponse.json(t, { headers: GET_CACHE });
  } catch {
    return NextResponse.json({ tallies: {}, total: 0 }, { headers: GET_CACHE });
  }
}

export async function POST(req: Request) {
  let body: {
    eventId?: unknown;
    optionKey?: unknown;
    action?: unknown;
    visitorId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
  const optionKey = typeof body.optionKey === "string" ? body.optionKey.trim() : "";
  const action = body.action === "remove" ? "remove" : "vote";
  const visitorId =
    typeof body.visitorId === "string" ? body.visitorId.trim().slice(0, 100) : "";

  if (!eventId || eventId.length > 100) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (action === "vote" && (!optionKey || optionKey.length > 100)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Logged-in user is the primary identity; visitorId is the anon fallback.
  // Accepts the web cookie session OR a mobile Bearer token.
  const user = await getRequestUser(req);
  if (!user && !visitorId) {
    return NextResponse.json({ error: "No identity" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    // Single-choice: clear this actor's existing vote first, so a re-vote just
    // switches options and a retract simply leaves nothing behind. Delete the
    // anonymous row too when a signed-in user also voted while anonymous, so the
    // two identities don't double-count.
    if (user) {
      await admin
        .from("event_poll_votes")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);
    }
    if (visitorId) {
      await admin
        .from("event_poll_votes")
        .delete()
        .eq("event_id", eventId)
        .eq("visitor_id", visitorId);
    }

    if (action === "vote") {
      const row = user
        ? { event_id: eventId, option_key: optionKey, user_id: user.id }
        : { event_id: eventId, option_key: optionKey, visitor_id: visitorId };
      const { error } = await admin.from("event_poll_votes").insert(row);
      // A racing double-tap can still trip the unique index; the row it kept is
      // this same actor+event, so the end state is correct — swallow 23505.
      if (error && error.code !== "23505") throw error;
    }

    const t = await talliesFor(admin, eventId);
    return NextResponse.json({
      eventId,
      ...t,
      mine: action === "vote" ? optionKey : null,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
