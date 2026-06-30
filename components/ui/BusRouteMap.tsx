"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Bus, ChevronDown, Check, Gauge, Clock, X, Sun, Moon } from "lucide-react";
import { BUS_ROUTES, BUS_STOPS } from "../../lib/data/busRoutes";
import { useAuthContext } from "../../lib/context/AuthContext";
import { OWNER_EMAIL } from "../../lib/config/owner";
import {
  buildGeom,
  snapToLine,
  pointAt,
  bearingAt,
  angleDiff,
  type RouteGeom,
  type LngLat,
} from "../../lib/geo/lineFollow";

// Tight extent covering every route, so the map can't be panned or zoomed out
// beyond the area the buses actually serve. Derived from the route geometry so
// it stays correct if lines are edited.
const ROUTE_EXTENT = (() => {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const r of BUS_ROUTES)
    for (const [lng, lat] of r.path) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  return { minLng, minLat, maxLng, maxLat };
})();

// What we fit the view to (defines the zoom-out floor).
const FIT_BOUNDS: [[number, number], [number, number]] = [
  [ROUTE_EXTENT.minLng, ROUTE_EXTENT.minLat],
  [ROUTE_EXTENT.maxLng, ROUTE_EXTENT.maxLat],
];

// Panning limit — a little looser than the fit so the fitted view isn't clamped.
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [ROUTE_EXTENT.minLng - 0.03, ROUTE_EXTENT.minLat - 0.03],
  [ROUTE_EXTENT.maxLng + 0.03, ROUTE_EXTENT.maxLat + 0.03],
];

// Switchable basemaps (OpenFreeMap). Users pick between the blue ("fiord") and
// the light ("positron") basemaps.
const MAP_STYLES = {
  fiord: "https://tiles.openfreemap.org/styles/fiord",
  positron: "https://tiles.openfreemap.org/styles/positron",
} as const;
type MapStyleId = keyof typeof MAP_STYLES;
const DEFAULT_STYLE: MapStyleId = "positron"; // light/white map by default

function readSavedStyle(): MapStyleId {
  if (typeof window === "undefined") return DEFAULT_STYLE;
  try {
    const v = localStorage.getItem("pp_map_style");
    return v === "positron" || v === "fiord" ? v : DEFAULT_STYLE;
  } catch {
    return DEFAULT_STYLE;
  }
}

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
  offline?: boolean; // owner endpoint only: bus is out of service, parked at last fix
};

// Line geometry, precomputed once, for snapping + smooth following.
const ROUTE_GEOM: Record<string, RouteGeom> = Object.fromEntries(
  BUS_ROUTES.map((r) => [r.id, buildGeom(r.path as LngLat[])]),
);

// Each route's stops, projected onto the line and sorted by distance along it,
// so we can tell which stop a bus just passed and which it's heading to.
const ROUTE_STOPS: Record<string, { name: string; along: number }[]> =
  Object.fromEntries(
    BUS_ROUTES.map((r) => {
      const g = ROUTE_GEOM[r.id];
      const stops = r.stopIds
        .map((sid) => BUS_STOPS.find((s) => s.id === sid))
        .filter((s): s is (typeof BUS_STOPS)[number] => !!s)
        .map((s) => ({
          name: s.name,
          along: g ? snapToLine(g, s.coordinates[0], s.coordinates[1]).along : 0,
        }))
        .sort((a, b) => a.along - b.along);
      return [r.id, stops];
    }),
  );

// Previous (last passed) and next (upcoming) stop for a bus at `along`, given the
// direction it's running the line.
function aroundStops(
  routeId: string,
  along: number,
  forward: boolean,
): { prev: string | null; next: string | null } {
  const stops = ROUTE_STOPS[routeId];
  if (!stops?.length) return { prev: null, next: null };
  let lower: string | null = null; // greatest along ≤ current
  let upper: string | null = null; // smallest along > current
  for (const s of stops) {
    if (s.along <= along) lower = s.name;
    else {
      upper = s.name;
      break;
    }
  }
  return forward ? { prev: lower, next: upper } : { prev: upper, next: lower };
}

const POLL_MS = 15_000; // smoothness is animated client-side, so 15s loses nothing
const STALE_MS = 5 * 60_000; // no fix in 5 min → grey out
const SNAP_MAX_M = 75; // snap to the line within this gap (route polyline is coarse
// + GPS jitters, so 45m detached the bus too eagerly); else show raw point
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
  root: HTMLDivElement; // outer wrapper given to MapLibre (it owns the position transform)
  pill: HTMLDivElement; // the coloured pill — scaled with zoom (own transform)
  numEl: HTMLSpanElement; // line number inside the white circle
};

// Marker size as a function of zoom: tiny when zoomed out, growing as you zoom
// in, but capped well below the old fixed size. Applied as a CSS scale on the
// pill (the wrapper keeps MapLibre's position transform untouched).
const markerScale = (zoom: number) => {
  const t = (zoom - 12) / (17 - 12); // 0 at z12 (≈fitted) … 1 at z17
  return 1.0 + Math.max(0, Math.min(1, t)) * 1.0; // 1.0 … 2.0
};

function busTimeAgo(iso: string | null): string {
  if (!iso) return "—";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "пред момент";
  if (min < 60) return `пред ${min} мин`;
  return `пред ${Math.round(min / 60)} ч`;
}

// Marker: a coloured rounded pill carrying a white circle with the line number
// and the bus photo (public/bus.png), matching the requested design.
function makeBusEl(short: string, color: string): BusEls {
  const root = document.createElement("div");
  root.style.cssText = "cursor:pointer;";

  const pill = document.createElement("div");
  pill.style.cssText =
    "display:flex;align-items:center;gap:4px;padding:3px 8px 3px 3px;" +
    `border-radius:999px;background:${color};border:1.5px solid #fff;` +
    "box-shadow:0 1px 4px rgba(0,0,0,0.3);transform-origin:center;will-change:transform;";

  const circle = document.createElement("span");
  circle.style.cssText =
    "display:flex;align-items:center;justify-content:center;width:18px;height:18px;" +
    "flex:0 0 auto;border-radius:999px;background:#fff;font:800 11px/1 system-ui,sans-serif;";
  const numEl = document.createElement("span");
  numEl.textContent = short;
  numEl.style.color = color;
  circle.appendChild(numEl);

  const img = document.createElement("img");
  img.src = "/bus.png";
  img.alt = "";
  img.draggable = false;
  img.style.cssText = "height:18px;width:auto;display:block;flex:0 0 auto;";

  pill.appendChild(circle);
  pill.appendChild(img);
  root.appendChild(pill);
  return { marker: null as unknown as maplibregl.Marker, root, pill, numEl };
}

export default function BusRouteMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  // Which bus the detail panel is showing (null = closed). The panel is a fixed
  // window (left dock on lg+, bottom drawer on mobile/tablet), not glued to the
  // marker, so we only need the id — React renders the panel from live data.
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const busStateRef = useRef<Map<number, BusAnim>>(new Map());
  const busElsRef = useRef<Map<number, BusEls>>(new Map());
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(
    () => new Set(BUS_ROUTES.map((r) => r.id)),
  );
  // Mirror of activeRoutes for the map callbacks (which live outside React and
  // must re-apply visibility after a basemap swap wipes the layers).
  const activeRoutesRef = useRef(activeRoutes);
  useEffect(() => {
    activeRoutesRef.current = activeRoutes;
  }, [activeRoutes]);
  const [mapReady, setMapReady] = useState(false);
  const [liveBuses, setLiveBuses] = useState<LiveBus[]>([]);

  // Basemap choice (blue Fiord ↔ light Positron), remembered per browser. Starts at the default
  // for SSR parity, then the saved choice is applied after mount (the map itself
  // is built directly from the saved style in the init effect, so no flicker).
  const [mapStyle, setMapStyle] = useState<MapStyleId>(DEFAULT_STYLE);
  const appliedStyleRef = useRef<MapStyleId>(readSavedStyle());
  useEffect(() => {
    // Defer to a microtask so this post-mount sync isn't flagged as a cascading
    // render; the map itself is already built from the saved style, so this only
    // brings the toggle highlight in line.
    const saved = readSavedStyle();
    if (saved === DEFAULT_STYLE) return;
    const t = setTimeout(() => setMapStyle(saved), 0);
    return () => clearTimeout(t);
  }, []);
  function chooseStyle(id: MapStyleId) {
    setMapStyle(id);
    try {
      localStorage.setItem("pp_map_style", id);
    } catch {
      /* ignore */
    }
  }

  // Owner-only extras: live speed in the popup, plus offline buses shown greyed
  // at their last known location. Gated to a single account (see OWNER_EMAIL).
  const { user } = useAuthContext();
  const isOwner = user?.email === OWNER_EMAIL;
  const [showSpeed, setShowSpeed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("pp_admin_show_speed") === "1";
    } catch {
      return false;
    }
  });
  function toggleSpeed() {
    setShowSpeed((s) => {
      const next = !s;
      try {
        localStorage.setItem("pp_admin_show_speed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES[readSavedStyle()],
      center: [21.555, 41.347],
      zoom: 13.3,
      minZoom: 11, // raised to the fitted zoom on load (see fitBounds below)
      maxZoom: 18,
      maxBounds: MAX_BOUNDS,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // (Re)add our route + stop layers on top of the basemap. Runs on first load
    // AND after every basemap swap (setStyle wipes custom sources/layers), so it
    // must be idempotent and re-apply the current line-visibility filter.
    const addOverlays = () => {
      const active = activeRoutesRef.current;

      // ── Route lines ──────────────────────────────────────────────────────────
      BUS_ROUTES.forEach((route) => {
        if (!map.getSource(`route-${route.id}`)) {
          map.addSource(`route-${route.id}`, {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: { type: "LineString", coordinates: route.path },
              properties: {},
            },
          });
        }
        const vis = active.has(route.id) ? "visible" : "none";
        // White halo so routes are legible over the basemap
        if (!map.getLayer(`route-${route.id}-halo`)) {
          map.addLayer({
            id: `route-${route.id}-halo`,
            type: "line",
            source: `route-${route.id}`,
            layout: { "line-join": "round", "line-cap": "round", visibility: vis },
            paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.7 },
          });
        }
        if (!map.getLayer(`route-${route.id}-line`)) {
          map.addLayer({
            id: `route-${route.id}-line`,
            type: "line",
            source: `route-${route.id}`,
            layout: { "line-join": "round", "line-cap": "round", visibility: vis },
            paint: { "line-color": route.color, "line-width": 4.5 },
          });
        }
      });

      // ── Bus stops ─────────────────────────────────────────────────────────────
      if (!map.getSource("bus-stops")) {
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
      }

      // Invisible large hit target — makes stops easy to tap on mobile
      if (!map.getLayer("stops-hit")) {
        map.addLayer({
          id: "stops-hit",
          type: "circle",
          source: "bus-stops",
          paint: { "circle-radius": 18, "circle-color": "transparent", "circle-opacity": 0 },
        });
      }

      // Outer white circle — small when zoomed out (just dots), growing as you
      // zoom in so they become easy tap targets.
      if (!map.getLayer("stops-bg")) {
        map.addLayer({
          id: "stops-bg",
          type: "circle",
          source: "bus-stops",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 3, 14, 5, 16, 9],
            "circle-color": "#ffffff",
            "circle-stroke-color": "#52525b",
            "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 16, 1.5],
          },
        });
      }

      // Inner filled dot
      if (!map.getLayer("stops-dot")) {
        map.addLayer({
          id: "stops-dot",
          type: "circle",
          source: "bus-stops",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 1.2, 14, 2.2, 16, 4],
            "circle-color": "#27272a",
          },
        });
      }

      // Re-apply the current stop filter (which routes are visible).
      const activeStopIds = BUS_STOPS.filter((s) =>
        s.routeIds.some((rid) => active.has(rid)),
      ).map((s) => s.id);
      const stopFilter: maplibregl.FilterSpecification = [
        "in",
        ["get", "id"],
        ["literal", activeStopIds],
      ];
      map.setFilter("stops-hit", stopFilter);
      map.setFilter("stops-bg", stopFilter);
      map.setFilter("stops-dot", stopFilter);
    };

    // Stop hover/click + background-click handlers. Bound once to the map (they
    // survive style swaps), keyed by layer id which addOverlays re-creates.
    const registerInteractions = () => {
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
        setSelectedBusId(null); // opening a stop popup closes the bus panel
        popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 10, maxWidth: "240px", className: "pp-map-popup" })
          .setLngLat(coords)
          .setHTML(
            `<div style="padding:10px 12px;font-family:inherit;">
              <p style="margin:0 0 5px;font-size:13px;font-weight:600;color:#18181b;">${props.name}</p>
              <div style="display:flex;gap:4px;flex-wrap:wrap;">${badges}</div>
            </div>`,
          )
          .addTo(map);
      });

      // Dismiss popup when clicking the map background
      map.on("click", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["stops-hit"] });
        if (!features.length) {
          popupRef.current?.remove();
          setSelectedBusId(null);
        }
      });
    };

    // 'style.load' fires on the initial style and again after every setStyle, so
    // re-add our overlays each time. One-time setup (framing, zoom floor, event
    // handlers) runs only on the first style load.
    let initialized = false;
    map.on("style.load", () => {
      addOverlays();
      if (!initialized) {
        initialized = true;
        // Frame the whole network and make that the zoom-out floor.
        map.fitBounds(FIT_BOUNDS, { padding: 24, duration: 0 });
        map.setMinZoom(map.getZoom());
        registerInteractions();
        // Scale every marker with the zoom level (small when out, larger when in).
        map.on("zoom", () => {
          const s = markerScale(map.getZoom());
          for (const el of busElsRef.current.values())
            el.pill.style.transform = `scale(${s})`;
        });
        setMapReady(true);
      }
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

  // ── Swap basemap when the user picks a different style ───────────────────────
  // setStyle wipes custom layers; the 'style.load' handler above re-adds them.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (appliedStyleRef.current === mapStyle) return;
    appliedStyleRef.current = mapStyle;
    map.setStyle(MAP_STYLES[mapStyle]);
  }, [mapStyle, mapReady]);

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

    // The owner gets the authenticated endpoint, which also returns offline
    // buses (parked at their last fix); everyone else gets the public, cached one.
    const url = isOwner ? "/api/buses/positions/admin" : "/api/buses/positions";

    async function load() {
      try {
        const res = await fetch(url, { cache: "no-store" });
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
  }, [isOwner]);

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
        e = makeBusEl(short, baseColor);
        e.marker = new maplibregl.Marker({ element: e.root, anchor: "center" })
          .setLngLat([bus.lng, bus.lat])
          .addTo(map);
        e.pill.style.transform = `scale(${markerScale(map.getZoom())})`;
        els.set(bus.id, e);
      }
      // The pill ALWAYS carries the line colour (blue = line 2, etc.) so the line
      // is identifiable at a glance even when the bus is reassigned. Staleness is
      // shown by dimming the pill, not by greying the colour away.
      e.pill.style.background = baseColor;
      e.pill.style.opacity = stale ? "0.5" : "1";
      e.numEl.style.color = baseColor;
      e.numEl.textContent = short;

      // Click → open the React detail panel for this bus (closes any stop popup).
      e.root.onclick = (ev) => {
        ev.stopPropagation();
        popupRef.current?.remove();
        setSelectedBusId(bus.id);
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
        // If the panel was showing this (now-gone) bus, close it.
        setSelectedBusId((cur) => (cur === id ? null : cur));
      }
    }
  }, [liveBuses, activeRoutes, mapReady, isOwner, showSpeed]);

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

  // Center + zoom the map onto a chosen bus's current position (its live
  // animated spot if we have it, else its last fix). Re-shows its line first.
  function flyToBus(id: number) {
    const map = mapRef.current;
    const bus = liveBuses.find((b) => b.id === id);
    if (!map || !bus) return;
    if (!activeRoutes.has(bus.routeId)) {
      setActiveRoutes((prev) => new Set(prev).add(bus.routeId));
    }
    const st = busStateRef.current.get(id);
    const center: LngLat = st ? st.renderLngLat : [bus.lng, bus.lat];
    map.flyTo({ center, zoom: Math.max(map.getZoom(), 15.5), duration: 900, essential: true });
  }

  // ── Detail panel ────────────────────────────────────────────────────────────
  // The bus the panel is showing (drops out if the bus disappears between polls).
  const selectedBus =
    selectedBusId != null
      ? liveBuses.find((b) => b.id === selectedBusId) ?? null
      : null;

  // A stop node on the vertical rail: a coloured dot (ringed so the connector
  // line reads as passing cleanly behind it) + the stop name.
  const stopNode = (
    dotColor: string,
    size: number,
    name: string | null,
    strong: boolean,
  ) => (
    <div className="flex min-h-8 items-center gap-2.5">
      <span className="relative z-1 flex w-6 shrink-0 justify-center">
        <span
          className="rounded-full"
          style={{
            width: size,
            height: size,
            background: dotColor,
            boxShadow: "0 0 0 3px #fff",
          }}
        />
      </span>
      <span
        className="min-w-0 text-[13px]"
        style={{ color: strong ? "#18181b" : "#71717a", fontWeight: strong ? 700 : 500 }}>
        {name ?? "—"}
      </span>
    </div>
  );

  // The middle node: the bus glyph on the rail + speed (owner) / time beside it.
  const busNode = (color: string, bus: LiveBus) => (
    <div className="flex min-h-10 items-center gap-2.5">
      <span className="relative z-1 flex w-6 shrink-0 justify-center">
        <span
          className="flex h-7.5 w-7.5 items-center justify-center rounded-full"
          style={{ background: color, boxShadow: "0 1px 5px rgba(0,0,0,.25),0 0 0 3px #fff" }}>
          {/* public/bus icon.svg, recoloured white to sit on the coloured dot */}
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static inline SVG glyph */}
          <img
            src="/bus%20icon.svg"
            alt=""
            width={16}
            height={16}
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </span>
      </span>
      <span className="flex flex-col gap-1">
        {isOwner && showSpeed && (
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-700">
            <Gauge size={13} /> {Math.round(bus.speed ?? 0)} км/ч
          </span>
        )}
        <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <Clock size={13} /> {busTimeAgo(bus.lastSeen)}
        </span>
      </span>
    </div>
  );

  // Inner content of the panel — shared by the desktop dock and the mobile drawer.
  const panelInner = (() => {
    if (!selectedBus) return null;
    const bus = selectedBus;
    const route = BUS_ROUTES.find((r) => r.id === bus.routeId);
    const baseColor = route?.color ?? "#52525b";
    const offline = bus.offline === true;
    const color = offline ? GREY : baseColor;

    // Prev/next only make sense when the bus sits on the line. Derive purely from
    // the latest fix (snap + course) so the panel needs no animation-ref access.
    const geom = ROUTE_GEOM[bus.routeId];
    const snap = geom ? snapToLine(geom, bus.lng, bus.lat) : null;
    const onLine = !!snap && snap.gap <= SNAP_MAX_M;
    const forward =
      onLine && geom && bus.course != null
        ? angleDiff(bearingAt(geom, snap.along, true), bus.course) <= 90
        : true;
    const { prev, next } =
      onLine && snap
        ? aroundStops(bus.routeId, snap.along, forward)
        : { prev: null, next: null };

    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5">
          <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color }}>
            {route?.name ?? ""}
            {offline && (
              <span className="rounded-full border border-zinc-200 bg-zinc-100 px-1.5 py-px text-[10px] font-bold text-zinc-500">
                ОФЛАЈН
              </span>
            )}
          </span>
          <button
            onClick={() => setSelectedBusId(null)}
            title="Затвори"
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700">
            <X size={22} />
          </button>
        </div>
        <div className="relative flex flex-col gap-2 px-4 pb-4">
          <div className="absolute left-6.75 top-4 bottom-4 w-0.5 bg-zinc-200" />
          {offline ? (
            <>
              {stopNode(GREY, 11, prev, true)}
              {busNode(color, bus)}
            </>
          ) : (
            <>
              {stopNode("#cbd5e1", 11, prev, false)}
              {busNode(color, bus)}
              {stopNode(baseColor, 13, next, true)}
            </>
          )}
        </div>
      </div>
    );
  })();

  return (
    <div className="space-y-3">
      {/* Quick bus picker — one button per active bus; flies the map to it.
          Mobile: a single row of quarter-width buttons; ≥sm: natural wrap. */}
      {liveBuses.length > 0 && (
        <div
          className="grid gap-2 sm:flex sm:flex-wrap"
          style={{
            gridTemplateColumns: `repeat(${Math.min(liveBuses.length, 4)}, minmax(0, 1fr))`,
          }}>

          {liveBuses.map((bus) => {
            const route = BUS_ROUTES.find((r) => r.id === bus.routeId);
            const short = route?.name.replace(/[^0-9]/g, "") || bus.label;
            return (
              <button
                key={bus.id}
                onClick={() => flyToBus(bus.id)}
                title={`Зумирај на ${bus.label}`}
                className="flex min-w-0 items-center justify-center gap-1 rounded-sm  bg-white px-2 py-2 text-[13px]  sm:px-3"
                style={{ borderColor: "#000000 " }}>
                <Bus size={15} className="shrink-0" />
                {/* mobile: just the line number; ≥sm: the full line name */}
                <span className="truncate sm:hidden">{short}</span>
                <span className="hidden truncate sm:inline">{route?.name ?? bus.label}</span>
              </button>
            );
          })}
        </div>
      )}

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
      <div className="relative rounded-2xl overflow-hidden border border-zinc-200 h-115">
        <div ref={containerRef} className="w-full h-full" />

        {/* Hint label */}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-white/80 backdrop-blur-sm px-2.5 py-1 text-[11px] text-zinc-500 border border-zinc-100 shadow-sm">
          Кликни на точките за повеќе детели
        </div>

        {/* Bus detail panel — left dock on lg+, bottom drawer on mobile/tablet */}
        {selectedBus && (
          <>
            {/* Desktop: slides in from the left edge */}
            <div className="pp-panel-left absolute inset-y-3 left-3 z-40 hidden w-60 overflow-y-auto rounded-2xl border border-white/60 bg-linear-to-b from-white/85 to-white/55 shadow-xl ring-1 ring-white/40 backdrop-blur-2xl lg:block">
              {panelInner}
            </div>
            {/* Mobile / tablet: slides up like a bottom drawer (10% smaller content,
                inset 5% on each side) */}
            <div className="pp-panel-up absolute right-[5%] bottom-0 left-[5%] z-40 max-h-[70%] overflow-y-auto rounded-t-2xl border-t border-white/60 bg-linear-to-b from-white/90 to-white/60 shadow-2xl ring-1 ring-white/40 backdrop-blur-2xl lg:hidden">
              <div className="flex justify-center pt-2">
                <span className="h-1 w-9 rounded-full bg-zinc-300" />
              </div>
              <div style={{ zoom: 0.9 }}>{panelInner}</div>
            </div>
          </>
        )}

        {/* Top-left controls: basemap switch (everyone) + speed toggle (owner) */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
          {/* Basemap style switch */}
          <div className="flex items-center gap-0.5 rounded-xl border border-zinc-200 bg-white/85 p-0.5 shadow-sm backdrop-blur-sm">
            {([
              ["positron", "Дневна", Sun],
              ["fiord", "Ноќна", Moon],
            ] as [MapStyleId, string, typeof Sun][]).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => chooseStyle(id)}
                title={`Изглед на мапа: ${label}`}
                aria-label={label}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  mapStyle === id
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-100"
                }`}>
                <Icon size={15} />
              </button>
            ))}
          </div>

          {/* Owner-only: toggle live speed in the bus popup */}
          {isOwner && (
            <button
              onClick={toggleSpeed}
              title="Само за тебе — прикажи брзина во прозорчето"
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm transition-colors ${
                showSpeed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-white/85 text-zinc-500"
              }`}>
              <Gauge size={13} />
              Брзина {showSpeed ? "вкл." : "иск."}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
