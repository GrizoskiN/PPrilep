// GET /api/cron/event-reminders
//
// Daily Vercel Cron at 07:00 UTC (see vercel.json) — 09:00 in Skopje through
// summer, 08:00 in winter. Pushes "Потсети ме" reminders to every opted-in
// device for events happening TODAY, then stamps notified_at so a device is
// reminded exactly once.
//
// One morning sweep, not a per-event countdown: the Hobby plan allows a single
// daily cron, so there is no later run to catch an event whose ideal reminder
// time hasn't arrived yet. Gating on "min(11:00, start − 3h)" under a daily
// schedule would silently drop every evening event — the 09:00 run would judge
// it not-yet-due and nothing would fire again that day. So the rule is simply:
// remind about anything today that hasn't started yet. Most events clear the
// intended 3h lead comfortably; something starting before ~09:00 gets less
// notice, which is the honest trade for one run a day.
//
// Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Required, so the
// endpoint can't be triggered by the public. The same secret triggers a manual
// run.

import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { fetchCityEvents } from "@/lib/sanity/queries";
import { eventPath } from "@/lib/data/events";
import { sendExpoPush, type PushMessage } from "@/lib/push/expo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_URL = "https://mojprilep.mk";
const TZ = "Europe/Skopje";

/** Local Europe/Skopje "now" as { date: "YYYY-MM-DD", minutes: sinceMidnight }. */
function skopjeNow(): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  // en-CA formats the date as YYYY-MM-DD.
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  // "24" can appear at midnight in some engines — normalise to 0.
  const h = Number(get("hour")) % 24;
  const m = Number(get("minute"));
  return { date, minutes: h * 60 + m };
}

/** First "HH:MM" in a free-text time field → minutes since midnight, or null. */
function parseStartMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = skopjeNow();
  const admin = createAdminClient();

  let events;
  try {
    events = await fetchCityEvents();
  } catch (e) {
    console.error("[cron/event-reminders] sanity", e);
    return NextResponse.json({ error: "Could not read events" }, { status: 500 });
  }

  // Only today's events can be "due" right now.
  const todays = events.filter((ev) => ev.startDate === now.date);

  let totalSent = 0;
  let totalPruned = 0;
  const processed: { event: string; sent: number }[] = [];

  for (const ev of todays) {
    const startMin = parseStartMinutes(ev.time);

    // An all-day event (no parseable time) is always still "ahead" of the
    // morning run; a timed one only counts if it hasn't started.
    const beforeStart = startMin === null ? true : now.minutes < startMin;
    if (!beforeStart) continue;

    // Opted-in devices not yet reminded for this event.
    const { data: rows, error } = await admin
      .from("event_reminders")
      .select("id, expo_token")
      .eq("event_id", ev._id)
      .is("notified_at", null);
    if (error) {
      console.error("[cron/event-reminders] reminders", error);
      continue;
    }
    const pending = (rows ?? []) as { id: number; expo_token: string }[];
    if (pending.length === 0) continue;

    const link = `${BASE_URL}${eventPath(ev)}`;
    const whenBits = [ev.time, ev.location].filter(Boolean).join(" · ");
    const messages: PushMessage[] = pending.map((r) => ({
      to: r.expo_token,
      title: "Наскоро започнува 📅",
      body: whenBits ? `${ev.title} — ${whenBits}` : ev.title,
      data: { link, type: "event" },
      channelId: "default",
    }));

    const tickets = await sendExpoPush(messages);

    const dead: string[] = [];
    tickets.forEach((t, i) => {
      const code = (t.details as { error?: string } | undefined)?.error;
      if (t.status === "error" && code === "DeviceNotRegistered") dead.push(pending[i].expo_token);
    });

    // Stamp as sent so they're never re-reminded. Do this for all pending rows
    // (even the few that erred) — a stuck reminder retried tomorrow, after the
    // event has passed, is worse than one missed push, and dead tokens are
    // pruned below anyway.
    const ids = pending.map((r) => r.id);
    await admin
      .from("event_reminders")
      .update({ notified_at: new Date().toISOString() })
      .in("id", ids);

    if (dead.length) {
      await admin.from("event_reminders").delete().in("expo_token", dead);
      await admin.from("push_subscriptions").delete().in("expo_token", dead);
      totalPruned += dead.length;
    }

    totalSent += pending.length;
    processed.push({ event: ev._id, sent: pending.length });
  }

  return NextResponse.json({ ok: true, sent: totalSent, pruned: totalPruned, events: processed });
}
