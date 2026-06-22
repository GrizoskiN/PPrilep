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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN = process.env.FLESPI_TOKEN;
const FIELDS =
  "server.timestamp,position.latitude,position.longitude,position.speed,position.direction,position.valid";
const MAX_AGE_S = 30 * 60; // hide a bus with no valid fix in 30 min (out of service)

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=8, stale-while-revalidate=20",
};

type Msg = {
  "server.timestamp"?: number;
  "position.latitude"?: number;
  "position.longitude"?: number;
  "position.speed"?: number;
  "position.direction"?: number;
  "position.valid"?: boolean;
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Newest valid fix for a device, by Flespi receive time. Null on error/no fix. */
async function lastFix(deviceId: number): Promise<Msg | null> {
  const data = encodeURIComponent(
    JSON.stringify({ reverse: true, count: 100, fields: FIELDS }),
  );
  try {
    const res = await fetch(
      `https://flespi.io/gw/devices/${deviceId}/messages?data=${data}`,
      { headers: { Authorization: `FlespiToken ${TOKEN}` }, cache: "no-store" },
    );
    if (!res.ok) throw new Error(`flespi ${res.status}`);
    const json = (await res.json()) as { result?: Msg[] };

    let best: Msg | null = null;
    let bestTs = -Infinity;
    for (const m of json.result ?? []) {
      if (m["position.valid"] === false) continue; // skip pre-lock junk
      if (num(m["position.latitude"]) === null) continue;
      if (num(m["position.longitude"]) === null) continue;
      const ts = num(m["server.timestamp"]);
      if (ts === null || ts <= bestTs) continue;
      bestTs = ts;
      best = m;
    }
    return best;
  } catch (e) {
    console.error("[buses/positions]", deviceId, e);
    return null;
  }
}

type FleetRow = {
  id: number;
  label: string;
  flespi_device_id: number;
  active_line_id: string | null;
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
    (fleet as FleetRow[]).map(async (b) => ({ b, fix: await lastFix(b.flespi_device_id) })),
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
