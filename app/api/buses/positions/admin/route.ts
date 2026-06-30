/**
 * GET /api/buses/positions/admin
 *
 * Owner-only, uncached variant of /api/buses/positions. Unlike the public
 * endpoint it does NOT hide buses that have gone quiet — it returns every
 * assigned bus's last known fix with an `offline` flag, so the owner can see
 * where a bus was when it was switched off (greyed, parked at its last spot).
 *
 * Private (per-user auth), so it must never be CDN-cached.
 */

import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { lastFix, num, type FleetRow } from "../../../../../lib/buses/flespi";
import { OWNER_EMAIL } from "../../../../../lib/config/owner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN = process.env.FLESPI_TOKEN;
const OFFLINE_S = 30 * 60; // no valid fix in 30 min → treat as offline (out of service)

const NO_CACHE = { "Cache-Control": "private, no-store" };

export async function GET() {
  // Owner gate — this exposes offline buses, so it's restricted to the owner.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== OWNER_EMAIL) {
    return NextResponse.json({ buses: [] }, { status: 403, headers: NO_CACHE });
  }

  const empty = NextResponse.json(
    { buses: [], updatedAt: new Date().toISOString() },
    { headers: NO_CACHE },
  );
  if (!TOKEN) return empty;

  const admin = createAdminClient();
  const { data: fleet, error } = await admin
    .from("buses")
    .select("id,label,flespi_device_id,active_line_id")
    .eq("is_active", true)
    .not("active_line_id", "is", null);
  if (error) {
    console.error("[buses/positions/admin] fleet", error.message);
    return empty;
  }
  if (!fleet || fleet.length === 0) return empty;

  const nowS = Date.now() / 1000;
  const fixes = await Promise.all(
    (fleet as FleetRow[]).map(async (b) => ({ b, fix: await lastFix(b.flespi_device_id, TOKEN!) })),
  );

  const buses = fixes.flatMap(({ b, fix }) => {
    if (!fix) return []; // never had a valid fix → nothing to show
    const ts = num(fix["server.timestamp"]);
    if (ts === null) return [];
    return [
      {
        id: b.id,
        label: b.label,
        routeId: b.active_line_id,
        lat: num(fix["position.latitude"])!,
        lng: num(fix["position.longitude"])!,
        speed: num(fix["position.speed"]),
        course: num(fix["position.direction"]),
        lastSeen: new Date(ts * 1000).toISOString(),
        offline: nowS - ts > OFFLINE_S, // kept on the map, just greyed + parked
      },
    ];
  });

  return NextResponse.json(
    { buses, updatedAt: new Date().toISOString() },
    { headers: NO_CACHE },
  );
}
