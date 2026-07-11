// POST /api/push/send
//
// Server-side broadcast of a civic notification to registered devices. Guarded
// by CRON_SECRET (same pattern as /api/cron/*), so only Vercel Cron, a trusted
// server job, or a manual admin call with the secret can trigger it — never the
// public. Reads enabled Expo tokens with the service role and fans out via the
// Expo Push API.
//
// Auth:  Authorization: Bearer <CRON_SECRET>
// Body (JSON): { title: string, body: string, data?: object, userId?: string }
//   userId — optional; target only that user's devices (else broadcast to all).
//
// Expo drops tokens it reports as DeviceNotRegistered; we prune those so the
// table stays clean.

import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { sendExpoPush, type PushMessage } from "../../../../lib/push/expo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    userId?: string;
  };

  const title = body.title?.trim();
  const message = body.body?.trim();
  if (!title || !message) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  let query = admin.from("push_subscriptions").select("expo_token").eq("enabled", true);
  if (body.userId) query = query.eq("user_id", body.userId);

  const { data: rows, error } = await query;
  if (error) {
    console.error("[push/send] fetch tokens", error);
    return NextResponse.json({ error: "Could not read subscriptions" }, { status: 500 });
  }

  const tokens = (rows ?? []).map((r) => r.expo_token as string).filter(Boolean);
  if (tokens.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, tickets: 0 });
  }

  const messages: PushMessage[] = tokens.map((to) => ({
    to,
    title,
    body: message,
    data: body.data ?? {},
    channelId: "default",
  }));

  const tickets = await sendExpoPush(messages);

  // Prune tokens Expo says are dead.
  const dead: string[] = [];
  tickets.forEach((t, i) => {
    const code = (t.details as { error?: string } | undefined)?.error;
    if (t.status === "error" && code === "DeviceNotRegistered") dead.push(tokens[i]);
  });
  if (dead.length) {
    await admin.from("push_subscriptions").delete().in("expo_token", dead);
  }

  const ok = tickets.filter((t) => t.status === "ok").length;
  return NextResponse.json({ ok: true, sent: tokens.length, delivered: ok, pruned: dead.length });
}
