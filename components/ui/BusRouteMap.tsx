"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Bus, ChevronDown, Check } from "lucide-react";
import { BUS_ROUTES, BUS_STOPS } from "../../lib/data/busRoutes";

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

const POLL_MS = 15_000; // device reports every ~30s, so 15s loses nothing
const STALE_MS = 5 * 60_000; // no fix in 5 min → treat as offline (greyed out)

function busTimeAgo(iso: string | null): string {
  if (!iso) return "—";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "пред момент";
  if (min < 60) return `пред ${min} мин`;
  return `пред ${Math.round(min / 60)} ч`;
}

function busBadgeEl(color: string, short: string, stale: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    display:flex;align-items:center;gap:3px;cursor:pointer;
    padding:3px 7px 3px 5px;border-radius:999px;
    background:${stale ? "#94a3b8" : color};color:#fff;
    font:700 12px/1 system-ui,sans-serif;white-space:nowrap;
    border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.35);
    opacity:${stale ? 0.75 : 1};
  `;
  el.innerHTML = `<span style="font-size:13px">🚌</span>${short ? `<span>${short}</span>` : ""}`;
  return el;
}

export default function BusRouteMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const busMarkersRef = useRef<Map<number, maplibregl.Marker>>(new Map());
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
    const busMarkers = busMarkersRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
      busMarkers.clear();
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

  // ── Sync live bus markers ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const markers = busMarkersRef.current;
    const live = new Set<number>();

    for (const bus of liveBuses) {
      // Hide a bus when its line is toggled off (consistent with route lines).
      if (!activeRoutes.has(bus.routeId)) continue;
      live.add(bus.id);

      const route = BUS_ROUTES.find((r) => r.id === bus.routeId);
      const color = route?.color ?? "#52525b";
      const short = route?.name.replace(/[^0-9]/g, "") ?? "";
      const stale = bus.lastSeen
        ? Date.now() - new Date(bus.lastSeen).getTime() > STALE_MS
        : true;

      // Assigning onclick (not addEventListener) replaces any prior handler,
      // so updated markers carry fresh position/speed in their popup.
      const onClick = (e: MouseEvent) => {
        e.stopPropagation();
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          offset: 14,
          maxWidth: "240px",
        })
          .setLngLat([bus.lng, bus.lat])
          .setHTML(
            `<div style="padding:8px 10px;font-family:inherit;">
              <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#18181b;">${bus.label}</p>
              <p style="margin:0 0 6px;font-size:12px;color:${color};font-weight:600;">${route?.name ?? ""}</p>
              <div style="display:flex;gap:10px;font-size:12px;color:#52525b;">
                <span>🚀 ${Math.round(bus.speed ?? 0)} км/ч</span>
                <span>🕒 ${busTimeAgo(bus.lastSeen)}</span>
              </div>
            </div>`,
          )
          .addTo(map);
      };

      const badge = busBadgeEl(color, short, stale);
      const existing = markers.get(bus.id);
      if (existing) {
        existing.setLngLat([bus.lng, bus.lat]);
        const markerEl = existing.getElement();
        markerEl.replaceChildren(...badge.childNodes);
        markerEl.onclick = onClick;
      } else {
        badge.onclick = onClick;
        markers.set(
          bus.id,
          new maplibregl.Marker({ element: badge }).setLngLat([bus.lng, bus.lat]).addTo(map),
        );
      }
    }

    // Drop markers for buses no longer live or whose line is hidden.
    for (const [id, marker] of markers) {
      if (!live.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
  }, [liveBuses, activeRoutes, mapReady]);

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
