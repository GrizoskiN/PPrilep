"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Bus, ChevronDown, Check } from "lucide-react";
import { BUS_ROUTES, BUS_STOPS } from "../../lib/data/busRoutes";
import {
  buildGeom,
  snapToLine,
  pointAt,
  bearingAt,
  angleDiff,
  type RouteGeom,
  type LngLat,
} from "../../lib/geo/lineFollow";

const PRILEP_BOUNDS: [[number, number], [number, number]] = [
  [21.44, 41.28],
  [21.67, 41.42],
];

// ── Live buses ────────────────────────────────────────────────────────────────
type LiveBus = {
  id: number;
  label: string;
  routeId: string;
  lat: number;
  lng: number;
  speed: number | null;
  course: number | null;
  lastSeen: string | null;
};

// Line geometry, precomputed once, for snapping + smooth following.
const ROUTE_GEOM: Record<string, RouteGeom> = Object.fromEntries(
  BUS_ROUTES.map((r) => [r.id, buildGeom(r.path as LngLat[])]),
);

const POLL_MS = 15_000; // smoothness is animated client-side, so 15s loses nothing
const STALE_MS = 5 * 60_000; // no fix in 5 min → grey out
const SNAP_MAX_M = 45; // snap to the line only within this gap, else show raw point
const MIN_TWEEN_MS = 1_500; // floor so a fix never teleports
const MAX_TWEEN_MS = 40_000; // ceiling so a long gap doesn't crawl forever
const GREY = "#94a3b8";

// Per-bus animation state — lives in a ref, mutated by the rAF loop (not React).
type BusAnim = {
  routeId: string;
  label: string;
  color: string;
  onRoute: boolean;
  // line-referenced tween (when onRoute)
  fromAlong: number;
  toAlong: number;
  forward: boolean;
  // raw-coordinate tween (when off route)
  fromLngLat: LngLat;
  toLngLat: LngLat;
  // animation clock
  startT: number;
  durationMs: number;
  renderAlong: number;
  renderLngLat: LngLat;
  bearing: number;
  // meta
  speed: number | null;
  lastSeen: string | null;
  fixKey: string; // dedupe identical fixes between polls
};

type BusEls = {
  marker: maplibregl.Marker;
  root: HTMLDivElement;
  noseWrap: HTMLDivElement;
  nose: HTMLDivElement;
  badge: HTMLDivElement;
  label: HTMLSpanElement;
};

function busTimeAgo(iso: string | null): string {
  if (!iso) return "—";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "пред момент";
  if (min < 60) return `пред ${min} мин`;
  return `пред ${Math.round(min / 60)} ч`;
}

// A pill with the bus icon + line number, plus a rotating "nose" triangle
// showing heading.
function makeBusEl(short: string): BusEls {
  const root = document.createElement("div");
  root.style.cssText = "position:relative;width:52px;height:52px;cursor:pointer;";

  const noseWrap = document.createElement("div");
  noseWrap.style.cssText =
    "position:absolute;inset:0;transform-origin:center;transition:transform 0.25s linear;";
  const nose = document.createElement("div");
  nose.style.cssText =
    "position:absolute;left:50%;top:0;transform:translateX(-50%);width:0;height:0;" +
    "border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:11px solid #000;";
  noseWrap.appendChild(nose);

  const badge = document.createElement("div");
  badge.style.cssText =
    "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);" +
    "display:flex;align-items:center;gap:3px;padding:4px 9px 4px 7px;" +
    "border-radius:999px;background:#000;color:#fff;font:700 14px/1 system-ui,sans-serif;" +
    "white-space:nowrap;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.35);";

  const icon = document.createElement("span");
  icon.style.cssText = "font-size:18px;line-height:1;";
  icon.textContent = "🚌";

  const label = document.createElement("span");
  label.textContent = short;
  if (!short) label.style.display = "none";

  badge.appendChild(icon);
  badge.appendChild(label);

  root.appendChild(noseWrap);
  root.appendChild(badge);
  return { marker: null as unknown as maplibregl.Marker, root, noseWrap, nose, badge, label };
}

export default function BusRouteMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const busStateRef = useRef<Map<number, BusAnim>>(new Map());
  const busElsRef = useRef<Map<number, BusEls>>(new Map());
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(
    () => new Set(BUS_ROUTES.map((r) => r.id)),
  );
  const [mapReady, setMapReady] = useState(false);
  const [liveBuses, setLiveBuses] = useState<LiveBus[]>([]);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [21.555, 41.347],
      zoom: 13.3,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: PRILEP_BOUNDS,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      // ── Route lines ──────────────────────────────────────────────────────────
      BUS_ROUTES.forEach((route) => {
        map.addSource(`route-${route.id}`, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "LineString", coordinates: route.path },
            properties: {},
          },
        });

        // White halo so routes are legible over the basemap
        map.addLayer({
          id: `route-${route.id}-halo`,
          type: "line",
          source: `route-${route.id}`,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.7 },
        });

        map.addLayer({
          id: `route-${route.id}-line`,
          type: "line",
          source: `route-${route.id}`,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": route.color, "line-width": 5 },
        });
      });

      // ── Bus stops ─────────────────────────────────────────────────────────────
      map.addSource("bus-stops", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: BUS_STOPS.map((stop) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: stop.coordinates },
            properties: { id: stop.id, name: stop.name, routeIds: stop.routeIds.join(",") },
          })),
        },
      });

      // Invisible large hit target — makes stops easy to tap on mobile
      map.addLayer({
        id: "stops-hit",
        type: "circle",
        source: "bus-stops",
        paint: { "circle-radius": 18, "circle-color": "transparent", "circle-opacity": 0 },
      });

      // Outer white circle — larger at lower zoom (mobile users zoom out more)
      map.addLayer({
        id: "stops-bg",
        type: "circle",
        source: "bus-stops",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 11, 15, 8],
          "circle-color": "#ffffff",
          "circle-stroke-color": "#52525b",
          "circle-stroke-width": 1.5,
        },
      });

      // Inner filled dot
      map.addLayer({
        id: "stops-dot",
        type: "circle",
        source: "bus-stops",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 5, 15, 3.5],
          "circle-color": "#27272a",
        },
      });

      // ── Stop interactions ────────────────────────────────────────────────────
      map.on("mouseenter", "stops-hit", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "stops-hit", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "stops-hit", (e) => {
        if (!e.features?.length) return;
        const props = e.features[0].properties as { name: string; routeIds: string };
        const coords = (
          e.features[0].geometry as GeoJSON.Point
        ).coordinates.slice(0, 2) as [number, number];

        // Which routes serve this stop?
        const routeIds = props.routeIds.split(",");
        const badges = routeIds
          .map((rid) => BUS_ROUTES.find((r) => r.id === rid))
          .filter(Boolean)
          .map(
            (r) =>
              `<span style="display:inline-flex;align-items:center;gap:4px;background:${r!.color}18;color:${r!.color};border:1px solid ${r!.color}44;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:700;">${r!.name}</span>`,
          )
          .join(" ");

        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 10, maxWidth: "240px" })
          .setLngLat(coords)
          .setHTML(
            `<div style="padding:8px 10px;font-family:inherit;">
              <p style="margin:0 0 5px;font-size:13px;font-weight:600;color:#18181b;">${props.name}</p>
              <div style="display:flex;gap:4px;flex-wrap:wrap;">${badges}</div>
            </div>`,
          )
          .addTo(map);
      });

      // Dismiss popup when clicking the map background
      map.on("click", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["stops-hit"] });
        if (!features.length) popupRef.current?.remove();
      });

      setMapReady(true);
    });

    mapRef.current = map;
    const els = busElsRef.current;
    const states = busStateRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
      els.clear();
      states.clear();
    };
  }, []);

  // ── Sync route layer visibility ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    BUS_ROUTES.forEach((route) => {
      const vis = activeRoutes.has(route.id) ? "visible" : "none";
      if (map.getLayer(`route-${route.id}-line`)) {
        map.setLayoutProperty(`route-${route.id}-line`, "visibility", vis);
        map.setLayoutProperty(`route-${route.id}-halo`, "visibility", vis);
      }
    });

    // Show only stops that belong to at least one active route
    if (map.getLayer("stops-bg")) {
      const activeIds = BUS_STOPS.filter((s) =>
        s.routeIds.some((rid) => activeRoutes.has(rid)),
      ).map((s) => s.id);

      const filter: maplibregl.FilterSpecification = [
        "in",
        ["get", "id"],
        ["literal", activeIds],
      ];
      map.setFilter("stops-hit", filter);
      map.setFilter("stops-bg", filter);
      map.setFilter("stops-dot", filter);
    }
  }, [activeRoutes, mapReady]);

  // ── Poll live bus positions (only while the tab is visible) ─────────────────
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const res = await fetch("/api/buses/positions", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setLiveBuses((json.buses ?? []) as LiveBus[]);
      } catch {
        /* keep last known positions on a transient error */
      }
    }
    function start() {
      if (timer) return;
      load();
      timer = setInterval(load, POLL_MS);
    }
    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // ── Reconcile live buses → markers + animation state ────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const els = busElsRef.current;
    const states = busStateRef.current;
    const live = new Set<number>();
    const now = Date.now();

    for (const bus of liveBuses) {
      // Hide a bus when its line is toggled off (consistent with route lines).
      if (!activeRoutes.has(bus.routeId)) continue;
      live.add(bus.id);

      const route = BUS_ROUTES.find((r) => r.id === bus.routeId);
      const baseColor = route?.color ?? "#52525b";
      const short = route?.name.replace(/[^0-9]/g, "") ?? "";
      const stale = bus.lastSeen
        ? now - new Date(bus.lastSeen).getTime() > STALE_MS
        : true;
      const color = stale ? GREY : baseColor;

      const geom = ROUTE_GEOM[bus.routeId];
      const snap = geom ? snapToLine(geom, bus.lng, bus.lat) : null;
      const onRoute = !!snap && snap.gap <= SNAP_MAX_M;

      // Ensure a marker exists.
      let e = els.get(bus.id);
      if (!e) {
        e = makeBusEl(short);
        e.marker = new maplibregl.Marker({ element: e.root, anchor: "center" })
          .setLngLat([bus.lng, bus.lat])
          .addTo(map);
        els.set(bus.id, e);
      }
      // Styling can change (stale → grey, or the bus reassigned to another line).
      e.badge.style.background = color;
      e.nose.style.borderBottomColor = color;
      e.label.textContent = short;
      e.label.style.display = short ? "" : "none";

      // Click → details popup (reassigned each reconcile to carry fresh data).
      e.root.onclick = (ev) => {
        ev.stopPropagation();
        const st = states.get(bus.id);
        const pos: LngLat = st ? st.renderLngLat : [bus.lng, bus.lat];
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          offset: 18,
          maxWidth: "240px",
        })
          .setLngLat(pos)
          .setHTML(
            `<div style="padding:8px 10px;font-family:inherit;">
              <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#18181b;">${bus.label}</p>
              <p style="margin:0 0 6px;font-size:12px;color:${baseColor};font-weight:600;">${route?.name ?? ""}</p>
              <div style="display:flex;gap:10px;font-size:12px;color:#52525b;">
                <span>🚀 ${Math.round(bus.speed ?? 0)} км/ч</span>
                <span>🕒 ${busTimeAgo(bus.lastSeen)}</span>
              </div>
            </div>`,
          )
          .addTo(map);
      };

      // Update animation state.
      const fixKey = bus.lastSeen ?? `${bus.lat},${bus.lng}`;
      const prev = states.get(bus.id);

      if (!prev) {
        // First sighting: place instantly (no tween).
        const along = onRoute ? snap!.along : 0;
        const lngLat: LngLat = onRoute ? [snap!.lng, snap!.lat] : [bus.lng, bus.lat];
        let forward = true;
        if (onRoute && geom && bus.course != null) {
          forward = angleDiff(bearingAt(geom, along, true), bus.course) <= 90;
        }
        const brg =
          onRoute && geom ? bearingAt(geom, along, forward) : bus.course ?? 0;
        states.set(bus.id, {
          routeId: bus.routeId, label: bus.label, color, onRoute,
          fromAlong: along, toAlong: along, forward,
          fromLngLat: lngLat, toLngLat: lngLat,
          startT: now, durationMs: 0,
          renderAlong: along, renderLngLat: lngLat, bearing: brg,
          speed: bus.speed, lastSeen: bus.lastSeen, fixKey,
        });
      } else if (prev.fixKey !== fixKey) {
        // New fix: tween from the current rendered position to the new target,
        // over the real time that elapsed between the two fixes.
        const deltaMs =
          prev.lastSeen && bus.lastSeen
            ? new Date(bus.lastSeen).getTime() - new Date(prev.lastSeen).getTime()
            : MIN_TWEEN_MS;
        const durationMs = Math.max(MIN_TWEEN_MS, Math.min(MAX_TWEEN_MS, deltaMs));

        if (onRoute && geom) {
          const from = prev.onRoute ? prev.renderAlong : snap!.along;
          let toAlong = snap!.along;
          // Loop wrap: take the short way around a closed line.
          if (geom.length > 0 && Math.abs(toAlong - from) > geom.length / 2) {
            toAlong += toAlong < from ? geom.length : -geom.length;
          }
          prev.forward =
            Math.abs(toAlong - from) > 1
              ? toAlong >= from
              : bus.course != null
                ? angleDiff(bearingAt(geom, snap!.along, true), bus.course) <= 90
                : prev.forward;
          prev.onRoute = true;
          prev.fromAlong = from;
          prev.toAlong = toAlong;
        } else {
          prev.onRoute = false;
          prev.fromLngLat = prev.renderLngLat;
          prev.toLngLat = [bus.lng, bus.lat];
          if (bus.course != null) prev.bearing = bus.course;
        }
        prev.routeId = bus.routeId;
        prev.label = bus.label;
        prev.color = color;
        prev.startT = now;
        prev.durationMs = durationMs;
        prev.speed = bus.speed;
        prev.lastSeen = bus.lastSeen;
        prev.fixKey = fixKey;
      } else {
        // Same fix between polls: just keep meta / colour fresh.
        prev.routeId = bus.routeId;
        prev.label = bus.label;
        prev.color = color;
      }
    }

    // Drop markers + state for buses no longer present or whose line is hidden.
    for (const [id, e] of els) {
      if (!live.has(id)) {
        e.marker.remove();
        els.delete(id);
        states.delete(id);
      }
    }
  }, [liveBuses, activeRoutes, mapReady]);

  // ── Animate markers along their line every frame ────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    let raf = 0;
    const tick = () => {
      const now = Date.now();
      for (const [id, st] of busStateRef.current) {
        const e = busElsRef.current.get(id);
        if (!e) continue;
        const p = st.durationMs <= 0 ? 1 : Math.min(1, (now - st.startT) / st.durationMs);

        let lngLat: LngLat;
        if (st.onRoute) {
          const geom = ROUTE_GEOM[st.routeId];
          const along = st.fromAlong + (st.toAlong - st.fromAlong) * p;
          lngLat = geom ? pointAt(geom, along) : st.renderLngLat;
          st.renderAlong = along;
          if (geom && Math.abs(st.toAlong - st.fromAlong) > 1) {
            st.bearing = bearingAt(geom, along, st.forward);
          }
        } else {
          lngLat = [
            st.fromLngLat[0] + (st.toLngLat[0] - st.fromLngLat[0]) * p,
            st.fromLngLat[1] + (st.toLngLat[1] - st.fromLngLat[1]) * p,
          ];
        }
        st.renderLngLat = lngLat;
        e.marker.setLngLat(lngLat);
        e.noseWrap.style.transform = `rotate(${st.bearing}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mapReady]);

  // Close the line dropdown when clicking anywhere outside it.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const d = detailsRef.current;
      if (d?.open && !d.contains(e.target as Node)) d.open = false;
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function toggleRoute(id: string) {
    setActiveRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {/* Route filter — dropdown list (toggle each line's visibility) */}
      <details ref={detailsRef} className="group relative z-20">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <Bus size={15} className="text-zinc-400" />
            Линии на превоз
            <span className="text-[11px] font-normal text-zinc-400">
              ({activeRoutes.size}/{BUS_ROUTES.length} прикажани)
            </span>
          </span>
          <ChevronDown
            size={16}
            className="shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="absolute left-0 right-0 top-full z-30 mt-1 space-y-0.5 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
          {BUS_ROUTES.map((route) => {
            const active = activeRoutes.has(route.id);
            return (
              <button
                key={route.id}
                onClick={() => toggleRoute(route.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-zinc-50">
                <span
                  className="inline-block h-2 w-5 shrink-0 rounded-full transition-opacity"
                  style={{ background: route.color, opacity: active ? 1 : 0.3 }}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[13px] font-semibold ${
                      active ? "text-zinc-700" : "text-zinc-400"
                    }`}>
                    {route.name}
                  </span>
                  <span className="block truncate text-[11px] text-zinc-400">
                    {route.description}
                  </span>
                </span>
                {active ? (
                  <Check size={16} className="shrink-0 text-emerald-500" />
                ) : (
                  <span className="shrink-0 text-[10px] font-medium text-zinc-300">
                    скриено
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </details>

      {/* Map frame */}
      <div className="relative rounded-2xl overflow-hidden border border-zinc-200 h-[460px]">
        <div ref={containerRef} className="w-full h-full" />

        {/* Hint label */}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-white/80 backdrop-blur-sm px-2.5 py-1 text-[11px] text-zinc-500 border border-zinc-100 shadow-sm">
          Кликни на точките за повеќе детели
        </div>
      </div>
    </div>
  );
}
