// POST /api/push/register
//
// The native app (Мој Прилеп mobile) registers its Expo push token here so the
// backend can send civic notifications (bus alerts, new events, municipal
// announcements). Registration is PUBLIC — anonymous devices are allowed so
// everyone can receive alerts — but if the request carries a Supabase Bearer
// token we attach the user_id, so a signed-in user's devices are known.
//
// Body (JSON): { token: string, platform?: "ios" | "android", enabled?: boolean }
// Upserts on the unique expo_token via the service role (bypasses RLS).

import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getRequestUser } from "../../../../lib/supabase/request-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXPO_TOKEN_RE = /^ExponentPushToken\[.+\]$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      platform?: string;
      enabled?: boolean;
    };

    const token = body.token?.trim();
    if (!token || !EXPO_TOKEN_RE.test(token)) {
      return NextResponse.json({ error: "Invalid Expo push token." }, { status: 400 });
    }

    const platform = body.platform === "ios" || body.platform === "android" ? body.platform : null;
    const enabled = body.enabled !== false;

    // Optional — attach the user if a valid Bearer token is present.
    const user = await getRequestUser(req).catch(() => null);

    const admin = createAdminClient();
    const { error } = await admin.from("push_subscriptions").upsert(
      {
        expo_token: token,
        user_id: user?.id ?? null,
        platform,
        enabled,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "expo_token" },
    );

    if (error) {
      console.error("[push/register]", error);
      return NextResponse.json({ error: "Could not register device." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/register]", err);
    return NextResponse.json({ error: "Could not register device." }, { status: 500 });
  }
}
