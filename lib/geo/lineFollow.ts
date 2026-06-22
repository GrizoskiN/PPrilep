// Helpers for placing a point on a polyline (a bus route) and moving it smoothly
// along that line. All distances are in metres; coordinates are [lng, lat].
//
// A local equirectangular projection around Prilep keeps the maths simple and is
// accurate to a few centimetres at city scale — plenty for snapping a bus to its
// route and interpolating between GPS fixes.

export type LngLat = [number, number];

const R = 6371000; // earth radius, metres
const DEG = Math.PI / 180;
const LAT0 = 41.34; // Prilep latitude — projection reference
const MX = R * DEG * Math.cos(LAT0 * DEG); // metres per degree of longitude
const MY = R * DEG; // metres per degree of latitude

export interface RouteGeom {
  path: LngLat[];
  cum: number[]; // cumulative distance to each vertex, metres
  length: number;
}

/** Precompute cumulative distances for a route path (do this once per route). */
export function buildGeom(path: LngLat[]): RouteGeom {
  const cum = [0];
  for (let i = 1; i < path.length; i++) {
    const dx = (path[i][0] - path[i - 1][0]) * MX;
    const dy = (path[i][1] - path[i - 1][1]) * MY;
    cum[i] = cum[i - 1] + Math.hypot(dx, dy);
  }
  return { path, cum, length: cum[cum.length - 1] ?? 0 };
}

/**
 * Nearest point on the line to (lng,lat): the distance ALONG the line, the
 * snapped coordinate, and the perpendicular GAP from the input to the line.
 */
export function snapToLine(
  g: RouteGeom,
  lng: number,
  lat: number,
): { along: number; lng: number; lat: number; gap: number } {
  const qx = lng * MX;
  const qy = lat * MY;
  let best = { along: 0, lng: g.path[0][0], lat: g.path[0][1], gap: Infinity };

  for (let i = 0; i < g.path.length - 1; i++) {
    const ax = g.path[i][0] * MX;
    const ay = g.path[i][1] * MY;
    const abx = g.path[i + 1][0] * MX - ax;
    const aby = g.path[i + 1][1] * MY - ay;
    const len2 = abx * abx + aby * aby;
    const t = len2
      ? Math.max(0, Math.min(1, ((qx - ax) * abx + (qy - ay) * aby) / len2))
      : 0;
    const projx = ax + t * abx;
    const projy = ay + t * aby;
    const gap = Math.hypot(qx - projx, qy - projy);
    if (gap < best.gap) {
      best = {
        along: g.cum[i] + t * (g.cum[i + 1] - g.cum[i]),
        lng: projx / MX,
        lat: projy / MY,
        gap,
      };
    }
  }
  return best;
}

function segmentAt(g: RouteGeom, along: number): { i0: number; i1: number; t: number } {
  const d = Math.max(0, Math.min(g.length, along));
  let i = 1;
  while (i < g.cum.length && g.cum[i] < d) i++;
  const i0 = i - 1;
  const i1 = Math.min(i, g.path.length - 1);
  const seg = g.cum[i1] - g.cum[i0] || 1;
  return { i0, i1, t: (d - g.cum[i0]) / seg };
}

/** Coordinate at a distance along the line (clamped to [0, length]). */
export function pointAt(g: RouteGeom, along: number): LngLat {
  const { i0, i1, t } = segmentAt(g, along);
  return [
    g.path[i0][0] + t * (g.path[i1][0] - g.path[i0][0]),
    g.path[i0][1] + t * (g.path[i1][1] - g.path[i0][1]),
  ];
}

/** Compass bearing of segment a→b (0 = north, clockwise). */
export function bearing(a: LngLat, b: LngLat): number {
  const dl = (b[0] - a[0]) * DEG;
  const y = Math.sin(dl) * Math.cos(b[1] * DEG);
  const x =
    Math.cos(a[1] * DEG) * Math.sin(b[1] * DEG) -
    Math.sin(a[1] * DEG) * Math.cos(b[1] * DEG) * Math.cos(dl);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}

/**
 * Bearing of the line at a distance, facing toward increasing distance when
 * forward=true, otherwise reversed (the bus running the line the other way).
 */
export function bearingAt(g: RouteGeom, along: number, forward: boolean): number {
  const { i0, i1 } = segmentAt(g, along);
  const brg = bearing(g.path[i0], g.path[i1]);
  return forward ? brg : (brg + 180) % 360;
}

/** Smallest absolute difference between two compass bearings, in degrees. */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs((a - b) % 360);
  return d > 180 ? 360 - d : d;
}
