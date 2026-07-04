/**
 * GET /api/buses/plates
 *
 * Private fleet detail: returns each bus's registration plate keyed by bus id.
 * Restricted to site admins and the Јавен превоз operator account
 * (agency_id = 'transport_parking') — the same gate as fleet management.
 * Never CDN-cached; unauthorized callers get an empty map.
 */

import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { plateForLabel } from "../../../../lib/data/busPlates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_CACHE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ plates: {} }, { status: 403, headers: NO_CACHE });
  }

  const [{ data: isAdmin }, { data: agencyId }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("current_user_agency"),
  ]);
  if (!isAdmin && agencyId !== "transport_parking") {
    return NextResponse.json({ plates: {} }, { status: 403, headers: NO_CACHE });
  }

  const { data, error } = await supabase.from("buses").select("id,label");
  if (error) {
    console.error("[buses/plates]", error.message);
    return NextResponse.json({ plates: {} }, { headers: NO_CACHE });
  }

  const plates: Record<number, string> = {};
  for (const b of data ?? []) {
    const p = plateForLabel(b.label as string);
    if (p) plates[b.id as number] = p;
  }

  return NextResponse.json({ plates }, { headers: NO_CACHE });
}
