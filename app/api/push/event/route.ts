// POST /api/push/event
//
// Sanity webhook: when a cityEvent is published, push "Нов настан" to every
// registered device exactly once. Separate from /api/social/publish (which is
// gated on autoPost for FB/IG) — a new event should notify citizens regardless
// of social settings, and must not re-notify on edits. Dedupe via the
// push_broadcasts table (unique event_id claim).
//
// Setup (user, one-time) — a THIRD Sanity webhook alongside revalidate/social:
//   URL:     https://www.mojprilep.mk/api/push/event?secret=<SANITY_SOCIAL_SECRET>
//   Trigger: Create, Update ·  Filter: _type == "cityEvent"
//   Run supabase/add_push_broadcasts.sql first.

import { NextResponse } from "next/server";
import { fetchEventFresh } from "@/lib/sanity/queries";
import { eventPath } from "@/lib/data/events";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendExpoPush, type PushMessage } from "@/lib/push/expo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SECRET = process.env.SANITY_SOCIAL_SECRET;
const BASE_URL = "https://mojprilep.mk";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (!SECRET || searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = body?._id as string | undefined;
  if (body?._type !== "cityEvent" || !id || id.startsWith("drafts.")) {
    return NextResponse.json({ skipped: "not a published event" });
  }

  const ev = await fetchEventFresh(id);
  if (!ev) return NextResponse.json({ skipped: "event not found" });

  // Don't announce events that already ended.
  const today = new Date().toISOString().slice(0, 10);
  if ((ev.endDate ?? ev.startDate) < today) {
    return NextResponse.json({ skipped: "event is in the past" });
  }

  const admin = createAdminClient();

  // Claim the event — unique event_id is our once-only lock.
  const { error: claimErr } = await admin.from("push_broadcasts").insert({ event_id: ev._id });
  if (claimErr) {
    if (claimErr.code === "23505") return NextResponse.json({ skipped: "already broadcast" });
    console.error("[push/event] claim", claimErr);
    return NextResponse.json({ error: "claim failed" }, { status: 500 });
  }

  // Fan out to every enabled device.
  const { data: rows, error } = await admin
    .from("push_subscriptions")
    .select("expo_token")
    .eq("enabled", true);
  if (error) {
    console.error("[push/event] tokens", error);
    return NextResponse.json({ error: "Could not read subscriptions" }, { status: 500 });
  }

  const tokens = (rows ?? []).map((r) => r.expo_token as string).filter(Boolean);
  if (tokens.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const link = `${BASE_URL}${eventPath(ev)}`;
  const messages: PushMessage[] = tokens.map((to) => ({
    to,
    title: "Нов настан во Прилеп 📅",
    body: ev.location ? `${ev.title} · ${ev.location}` : ev.title,
    data: { link, type: "event" },
    channelId: "default",
  }));

  const tickets = await sendExpoPush(messages);
  const dead: string[] = [];
  tickets.forEach((t, i) => {
    const code = (t.details as { error?: string } | undefined)?.error;
    if (t.status === "error" && code === "DeviceNotRegistered") dead.push(tokens[i]);
  });
  if (dead.length) await admin.from("push_subscriptions").delete().in("expo_token", dead);

  return NextResponse.json({ ok: true, sent: tokens.length, pruned: dead.length });
}
