/**
 * "Потсети ме" opt-in for city events (Случувања).
 *
 * A device asks to be reminded before an event. We store its Expo push token in
 * `event_reminders` (see supabase/add_event_reminders.sql); the hourly cron
 * (/api/cron/event-reminders) later pushes the reminder and stamps notified_at.
 *
 * Identity is the DEVICE (expo_token) so a signed-out person still gets the
 * push — same model as push_subscriptions. The Supabase user_id is attached when
 * a Bearer token is present, purely for a future "my reminders" screen. All
 * access is service-role; the table has RLS on with no public policies.
 *
 *   POST { eventId, expoToken, action: "add"|"remove" } → { eventId, reminded }
 */

import { NextResponse } from "next/server";
import { getRequestUser } from "../../../../lib/supabase/request-user";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { eventId?: unknown; expoToken?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
  const expoToken = typeof body.expoToken === "string" ? body.expoToken.trim() : "";
  const action = body.action === "remove" ? "remove" : "add";

  if (!eventId || eventId.length > 200) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  // A reminder is delivered to a device — without a token there's nothing to
  // remind. (The device gets its token from the push registration flow.)
  if (!expoToken || !expoToken.startsWith("ExponentPushToken")) {
    return NextResponse.json({ error: "No device token" }, { status: 400 });
  }

  // Optional — a signed-in user's id, so the row can be linked to them.
  const user = await getRequestUser(req);
  const admin = createAdminClient();

  try {
    if (action === "add") {
      // Insert; swallow the unique (event_id, expo_token) re-tap. `notified_at`
      // stays null so the cron will pick it up. Re-attach user_id if it changed.
      const { error } = await admin
        .from("event_reminders")
        .upsert(
          { event_id: eventId, expo_token: expoToken, user_id: user?.id ?? null },
          { onConflict: "event_id,expo_token" },
        );
      if (error) throw error;
      return NextResponse.json({ eventId, reminded: true });
    }

    await admin
      .from("event_reminders")
      .delete()
      .eq("event_id", eventId)
      .eq("expo_token", expoToken);
    return NextResponse.json({ eventId, reminded: false });
  } catch (e) {
    console.error("[events/remind]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
