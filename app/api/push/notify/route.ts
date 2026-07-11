// POST /api/push/notify
//
// Bridge: turns an in-app `notifications` row into a push to the recipient's
// devices. Intended to be called by a Supabase **Database Webhook** on INSERT
// into public.notifications, so every civic notification the app already
// creates (issue status change → reporter, comments, agency alerts, etc.) also
// arrives as a push — no per-feature wiring.
//
// Supabase Database Webhook setup (user, one-time):
//   Table: public.notifications · Events: INSERT · Type: HTTP Request
//   URL: https://www.mojprilep.mk/api/push/notify
//   HTTP header:  x-webhook-secret: <CRON_SECRET>
//
// Webhook body shape: { type: "INSERT", record: { recipient_user_id, title,
// body, link, ... } }. We look up that user's enabled Expo tokens and send.

import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { sendExpoPush, type PushMessage } from "../../../../lib/push/expo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type NotificationRecord = {
  recipient_user_id?: string;
  title?: string;
  body?: string;
  link?: string;
};

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  // Supabase webhooks can't send an Authorization header cleanly, so we use a
  // custom header. Accept either for flexibility.
  const provided =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => ({}))) as {
    record?: NotificationRecord;
    type?: string;
  };
  const rec = payload.record;
  if (!rec?.recipient_user_id || !rec.title) {
    return NextResponse.json({ ok: true, skipped: "no recipient/title" });
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("push_subscriptions")
    .select("expo_token")
    .eq("enabled", true)
    .eq("user_id", rec.recipient_user_id);

  if (error) {
    console.error("[push/notify] tokens", error);
    return NextResponse.json({ error: "Could not read subscriptions" }, { status: 500 });
  }

  const tokens = (rows ?? []).map((r) => r.expo_token as string).filter(Boolean);
  if (tokens.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const messages: PushMessage[] = tokens.map((to) => ({
    to,
    title: rec.title as string,
    body: rec.body ?? "",
    data: rec.link ? { link: rec.link } : {},
    channelId: "default",
  }));

  const tickets = await sendExpoPush(messages);

  // Prune dead tokens.
  const dead: string[] = [];
  tickets.forEach((t, i) => {
    const code = (t.details as { error?: string } | undefined)?.error;
    if (t.status === "error" && code === "DeviceNotRegistered") dead.push(tokens[i]);
  });
  if (dead.length) {
    await admin.from("push_subscriptions").delete().in("expo_token", dead);
  }

  return NextResponse.json({ ok: true, sent: tokens.length, pruned: dead.length });
}
