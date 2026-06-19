/**
 * GET /api/buses/positions
 *
 * Public, CDN-cacheable snapshot of every live bus's latest position. Pulls the
 * last known telemetry for our trackers straight from Flespi's REST API — Flespi
 * already stores per-device telemetry, so we don't persist positions ourselves.
 *
 * The `s-maxage` header lets Vercel's edge (and Cloudflare in front) serve one
 * cached response to all viewers, so we hit Flespi at most once every few
 * seconds no matter how many people watch — near-zero egress, the Cloudflare
 * fan-out goal.
 *
 * Setup: add FLESPI_TOKEN (a read-only Flespi token) to the env. Which devices
 * map to which line lives in lib/data/busRoutes.ts (LIVE_BUSES).
 */

import { NextResponse } from "next/server";
import { LIVE_BUSES } from "../../../../lib/data/busRoutes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN = process.env.FLESPI_TOKEN;
const FIELDS = "position.latitude,position.longitude,position.speed,position.direction";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=8, stale-while-revalidate=20",
};

type TelemetryValue = { ts?: number; value?: unknown };
type DeviceTelemetry = { id: number; telemetry?: Record<string, TelemetryValue> };

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function GET() {
  if (!TOKEN || LIVE_BUSES.length === 0) {
    return NextResponse.json(
      { buses: [], updatedAt: new Date().toISOString() },
      { headers: CACHE_HEADERS },
    );
  }

  const selector = LIVE_BUSES.map((b) => b.deviceId).join(",");
  let result: DeviceTelemetry[];
  try {
    const res = await fetch(
      `https://flespi.io/gw/devices/${selector}/telemetry/${FIELDS}`,
      {
        headers: { Authorization: `FlespiToken ${TOKEN}` },
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`flespi ${res.status}`);
    const json = (await res.json()) as { result?: DeviceTelemetry[] };
    result = json.result ?? [];
  } catch (e) {
    console.error("[buses/positions]", e);
    return NextResponse.json({ error: "Flespi unavailable" }, { status: 502 });
  }

  const byId = new Map(result.map((r) => [r.id, r.telemetry ?? {}]));

  const buses = LIVE_BUSES.flatMap((cfg) => {
    const t = byId.get(cfg.deviceId);
    const lat = num(t?.["position.latitude"]?.value);
    const lng = num(t?.["position.longitude"]?.value);
    if (lat === null || lng === null) return []; // no fix yet

    const ts = t?.["position.latitude"]?.ts;
    return [
      {
        id: cfg.deviceId,
        label: cfg.label,
        routeId: cfg.routeId,
        lat,
        lng,
        speed: num(t?.["position.speed"]?.value),
        course: num(t?.["position.direction"]?.value),
        lastSeen: typeof ts === "number" ? new Date(ts * 1000).toISOString() : null,
      },
    ];
  });

  return NextResponse.json(
    { buses, updatedAt: new Date().toISOString() },
    { headers: CACHE_HEADERS },
  );
}
