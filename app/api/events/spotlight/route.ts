/**
 * GET /api/events/spotlight
 *
 * The one event to feature in the right-column spotlight: the pinned event if
 * an editor set one, otherwise the next upcoming event (see fetchSpotlightEvent).
 * Bundles its interest count so the panel needs a single request.
 *
 * Edge-cached: events change rarely and the count is social proof, so a few
 * minutes of staleness is fine and keeps this near-free even though the right
 * panel renders on many routes.
 */

import { NextResponse } from "next/server";
import { fetchSpotlightEvent } from "../../../../lib/sanity/queries";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" };

export async function GET() {
  const event = await fetchSpotlightEvent();
  if (!event) {
    return NextResponse.json({ event: null, count: 0 }, { headers: CACHE });
  }

  let count = 0;
  try {
    const admin = createAdminClient();
    const res = await admin
      .from("event_interest")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event._id);
    count = res.count ?? 0;
  } catch {
    /* table may not exist yet — show the event without a count */
  }

  return NextResponse.json({ event, count }, { headers: CACHE });
}
