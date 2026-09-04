/**
 * "Which events has THIS signed-in user marked?" — the per-user companion to
 * the public counts endpoint.
 *
 * The counts route (../route.ts) is shared-edge-cached and identical for
 * everyone, so it can only carry the public totals. The button's pressed state
 * is personal, so it needs its own uncached, auth-scoped read: mark interest on
 * your phone and the website lights the same button up (and vice-versa).
 *
 * Keyed by user_id only — anonymous interest stays device-local (visitor_id in
 * localStorage), which is already correct for a single device. Serves both the
 * web cookie session and the mobile Bearer token via getRequestUser.
 *
 *   GET → { ids: string[] }   (empty for anonymous; never cached)
 */
import { NextResponse } from "next/server";
import { getRequestUser } from "../../../../../lib/supabase/request-user";
import { createAdminClient } from "../../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Personal + changes on every tap → must never be shared or cached.
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(req: Request) {
  try {
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ ids: [] }, { headers: NO_STORE });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("event_interest")
      .select("event_id")
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ ids: [] }, { headers: NO_STORE });

    const ids = (data ?? []).map((r) => (r as { event_id: string }).event_id);
    return NextResponse.json({ ids }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ids: [] }, { headers: NO_STORE });
  }
}
