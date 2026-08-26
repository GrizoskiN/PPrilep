// POST /api/push/event
//
// Sanity webhook: when a cityEvent is published, push "Нов настан" to every
// registered device exactly once. Separate from /api/social/publish (which is
// gated on autoPost for FB/IG) — a new event should notify citizens regardless
// of social settings, and must not re-notify on edits. Dedupe via the
// push_broadcasts table (unique event_id claim).
//
// NOTE: this route is NOT currently wired to a webhook. The Sanity plan includes
// two webhooks and both are in use (revalidate + social auto-post), so the same
// broadcast runs from /api/revalidate instead — see lib/push/newEvent.ts. The
// route is kept because it is the right home for this if a third webhook slot
// ever exists, and because it is a convenient manual trigger.
//
// Setup, if a slot frees up:
//   URL:     https://www.mojprilep.mk/api/push/event?secret=<SANITY_SOCIAL_SECRET>
//   Trigger: Create, Update ·  Filter: _type == "cityEvent"
//   Run supabase/add_push_broadcasts.sql first.

import { NextResponse } from "next/server";
import { broadcastNewEvent } from "@/lib/push/newEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SECRET = process.env.SANITY_SOCIAL_SECRET;

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (!SECRET || searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (body?._type !== "cityEvent") {
    return NextResponse.json({ skipped: "not a published event" });
  }

  const result = await broadcastNewEvent(body?._id as string | undefined);
  if ("error" in result) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
