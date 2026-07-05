/**
 * GET /api/buses/positions
 *
 * Public, CDN-cacheable snapshot of every live bus's latest position. Reads each
 * tracker's recent messages from Flespi and picks the newest VALID fix by
 * `server.timestamp` (Flespi's receive time).
 *
 * Why messages and not telemetry: these SinoTrack devices have a fast internal
 * clock and emit junk messages with a future timestamp + position.valid=false
 * before GPS locks. Flespi telemetry always returns the highest-timestamp
 * message, so that junk would freeze the position for ~30 min. server.timestamp
 * is immune to the device clock, and we drop invalid fixes outright.
 *
 * The `s-maxage` header lets Vercel's edge (and Cloudflare in front) serve one
 * cached response to all viewers — near-zero egress no matter how many watch.
 *
 * Setup: add FLESPI_TOKEN (a read-only Flespi token) to the env. Which device
 * runs which line lives in the `buses` table (operator-editable at runtime).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { lastFix, num, type FleetRow } from "../../../../lib/buses/flespi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN = process.env.FLESPI_TOKEN;
const MAX_AGE_S = 10 * 60; // hide a bus with no valid fix in 10 min (out of service).
// Its last-known/parked position stays visible to the owner only, via the admin
// endpoint (/api/buses/positions/admin), never to the public.

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
};

export async function GET() {
  const empty = NextResponse.json(
    { buses: [], updatedAt: new Date().toISOString() },
    { headers: CACHE_HEADERS },
  );
  if (!TOKEN) return empty;

  // In-service buses with a line assigned (operator-editable in the buses table).
  const admin = createAdminClient();
  const { data: fleet, error } = await admin
    .from("buses")
    .select("id,label,flespi_device_id,active_line_id")
    .eq("is_active", true)
    .not("active_line_id", "is", null);
  if (error) {
    console.error("[buses/positions] fleet", error.message);
    return empty;
  }
  if (!fleet || fleet.length === 0) return empty;

  const nowS = Date.now() / 1000;
  const fixes = await Promise.all(
    (fleet as FleetRow[]).map(async (b) => ({ b, fix: await lastFix(b.flespi_device_id, TOKEN!) })),
  );

  const buses = fixes.flatMap(({ b, fix }) => {
    if (!fix) return [];
    const ts = num(fix["server.timestamp"]);
    if (ts === null || nowS - ts > MAX_AGE_S) return []; // stale / out of service
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
      },
    ];
  });

  return NextResponse.json(
    { buses, updatedAt: new Date().toISOString() },
    { headers: CACHE_HEADERS },
  );
}
