/**
 * POST /api/push/broadcast  — admin-only manual event reminder.
 *
 * Sends a "reminder" push about ONE event to EVERY enabled device (not just the
 * opted-in ones) — the manual counterpart of the automatic cron. Use it to nudge
 * the whole city about something happening today/tomorrow. Unlike /api/push/event
 * (once-only, on publish) this is intentionally repeatable.
 *
 * Auth: the site admin only. Accepts the web cookie session or a mobile Bearer
 * token (so the admin can trigger it from the app too), then checks
 * profiles.is_admin / ADMIN_EMAIL.
 *
 *   POST { eventId } → { ok, sent, pruned }
 */

import { NextResponse } from "next/server";
import { getRequestUser } from "../../../../lib/supabase/request-user";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { fetchEventByKey } from "@/lib/sanity/queries";
import { eventPath } from "@/lib/data/events";
import { sendExpoPush, type PushMessage } from "@/lib/push/expo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE_URL = "https://mojprilep.mk";

export async function POST(req: Request) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Gate to the site admin: profiles.is_admin, or the configured ADMIN_EMAIL.
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin =
    Boolean(profile?.is_admin) ||
    (!!process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { eventId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  const ev = await fetchEventByKey(eventId);
  if (!ev) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: rows, error } = await admin
    .from("push_subscriptions")
    .select("expo_token")
    .eq("enabled", true);
  if (error) {
    console.error("[push/broadcast] tokens", error);
    return NextResponse.json({ error: "Could not read subscriptions" }, { status: 500 });
  }

  const tokens = (rows ?? []).map((r) => r.expo_token as string).filter(Boolean);
  if (tokens.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const link = `${BASE_URL}${eventPath(ev)}`;
  const whenBits = [ev.time, ev.location].filter(Boolean).join(" · ");
  const messages: PushMessage[] = tokens.map((to) => ({
    to,
    title: "Потсетник за настан 📅",
    body: whenBits ? `${ev.title} — ${whenBits}` : ev.title,
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
