"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BUS_ROUTES, BUS_STOPS } from "../../lib/data/busRoutes";

const PRILEP_BOUNDS: [[number, number], [number, number]] = [
  [21.44, 41.28],
  [21.67, 41.42],
];

export default function BusRouteMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(
    () => new Set(BUS_ROUTES.map((r) => r.id)),
  );
  const [mapReady, setMapReady] = useState(false);

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
    return () => {
      map.remove();
      mapRef.current = null;
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
      {/* Route toggle chips */}
      <div className="flex flex-wrap gap-2">
        {BUS_ROUTES.map((route) => {
          const active = activeRoutes.has(route.id);
          return (
            <button
              key={route.id}
              onClick={() => toggleRoute(route.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold border transition-all ${
                active
                  ? "bg-white border-zinc-200 text-zinc-700 shadow-sm"
                  : "bg-white/60 border-zinc-100 text-zinc-400"
              }`}>
              {/* Route color swatch */}
              <span
                className="inline-block h-2 w-5 rounded-full shrink-0 transition-opacity"
                style={{ background: route.color, opacity: active ? 1 : 0.25 }}
              />
              <span>{route.name}</span>
              <span
                className={`text-[10px] font-normal transition-opacity ${
                  active ? "text-zinc-400" : "text-zinc-300"
                }`}>
                {route.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Map frame */}
      <div className="relative rounded-2xl overflow-hidden border border-zinc-200 h-[460px]">
        <div ref={containerRef} className="w-full h-full" />

        {/* Hint label */}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-white/80 backdrop-blur-sm px-2.5 py-1 text-[11px] text-zinc-500 border border-zinc-100 shadow-sm">
          Допри / кликни на стопица за детали
        </div>
      </div>
    </div>
  );
}
