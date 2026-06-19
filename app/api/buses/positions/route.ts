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
 * Setup: add FLESPI_TOKEN (a read-only Flespi token) to the env. Which devices
 * map to which line lives in lib/data/busRoutes.ts (LIVE_BUSES).
 */

import { NextResponse } from "next/server";
import { LIVE_BUSES } from "../../../../lib/data/busRoutes";

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

export async function GET() {
  if (!TOKEN || LIVE_BUSES.length === 0) {
    return NextResponse.json(
      { buses: [], updatedAt: new Date().toISOString() },
      { headers: CACHE_HEADERS },
    );
  }

  const nowS = Date.now() / 1000;
  const fixes = await Promise.all(
    LIVE_BUSES.map(async (cfg) => ({ cfg, fix: await lastFix(cfg.deviceId) })),
  );

  const buses = fixes.flatMap(({ cfg, fix }) => {
    if (!fix) return [];
    const ts = num(fix["server.timestamp"]);
    if (ts === null || nowS - ts > MAX_AGE_S) return []; // stale / out of service
    return [
      {
        id: cfg.deviceId,
        label: cfg.label,
        routeId: cfg.routeId,
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
