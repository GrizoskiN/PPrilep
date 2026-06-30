"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
// Derive each route's stops from the SAME source the map dots use — every stop
// whose `routeIds` includes this route — so the panel's prev/next can never
// disagree with what's drawn. Order in the data is irrelevant: we sort by
// distance along the line.
const ROUTE_STOPS: Record<string, { name: string; along: number }[]> =
  Object.fromEntries(
    BUS_ROUTES.map((r) => {
      const g = ROUTE_GEOM[r.id];
      const stops = BUS_STOPS.filter((s) => s.routeIds.includes(r.id))
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
// The marker is built at its largest (zoomed-in) size and scaled DOWN when
// zoomed out. Downscaling a transform stays crisp; upscaling past the
// element's native size is what blurs the whole pill.
const markerScale = (zoom: number) => {
  const t = (zoom - 12) / (17 - 12); // 0 at z12 (≈fitted) … 1 at z17
  return 0.5 + Math.max(0, Math.min(1, t)) * 0.5; // 0.5 … 1.0
};

// Mix a #rrggbb colour toward white. t=0 → the colour, t=1 → white. Used to make
// the "lighter" end of each line's animated rail from the line's own colour.
function tint(hex: string, t: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// Each line gets its own "lane": a constant screen-pixel offset perpendicular to
// the route so overlapping lines render side-by-side (transit-map style) instead
// of stacking. Spread symmetrically around centre by route index.
const LANE_GAP = 4; // px between adjacent lanes
const laneOffset = (routeId: string): number => {
  const i = BUS_ROUTES.findIndex((r) => r.id === routeId);
  if (i < 0) return 0;
  return (i - (BUS_ROUTES.length - 1) / 2) * LANE_GAP;
};

// Stop pins are coloured by their line. A stop on several lines uses its first
// line's colour (filtering hides it when no serving line is active anyway).
const stopPinColor = (stop: (typeof BUS_STOPS)[number]): string =>
  BUS_ROUTES.find((r) => r.id === stop.routeIds[0])?.color ?? "#27272a";
// One pin image per distinct line colour, keyed by colour.
const STOP_PIN_COLORS = Array.from(new Set(BUS_ROUTES.map((r) => r.color)));
const STOP_IMG_PREFIX = "bus-stop-";
const stopImageName = (color: string) => `${STOP_IMG_PREFIX}${color}`;

// The stop icon's inner markup (public/bus-stop.svg, viewBox 0 0 24 24), inlined
// so the popup can render it in the line's colour without a second request.
// Children inherit `fill` from the parent <svg>, so colouring is one attribute.
const STOP_ICON_VIEWBOX = "0 0 24 24";
const STOP_ICON_INNER =
  '<path d="m15.5 7h-7a.50034.50034 0 0 0 -.5.5v3.091a22.81158 22.81158 0 0 0 4 .409 22.81158 22.81158 0 0 0 4-.409v-3.091a.50034.50034 0 0 0 -.5-.5z"/>' +
  '<circle cx="14" cy="14" r="1"/><circle cx="10" cy="14" r="1"/>' +
  '<path d="m12 0a12 12 0 1 0 12 12 12.01375 12.01375 0 0 0 -12-12zm6 10.5a.5.5 0 0 1 -1 0v5a1.49758 1.49758 0 0 1 -1 1.4079v.5921a.49971.49971 0 0 1 -.5.5h-1a.49971.49971 0 0 1 -.5-.5v-.5h-4v.5a.49971.49971 0 0 1 -.5.5h-1a.49971.49971 0 0 1 -.5-.5v-.5921a1.49758 1.49758 0 0 1 -1-1.4079v-5a.5.5 0 0 1 -1 0v-1a.49971.49971 0 0 1 .5-.5h.5v-1.5a1.50164 1.50164 0 0 1 1.5-1.5h7a1.50164 1.50164 0 0 1 1.5 1.5v1.5h.5a.49971.49971 0 0 1 .5.5z"/>';

// Rasterise the (monochrome) pin image recoloured to `color`, for map.addImage.
// Drawn at 2x for crispness (paired with pixelRatio: 2). A solid white disc is
// painted behind it so the icon's transparent cut-outs (the bus "windows") read
// as white instead of showing the basemap through — clean, not see-through.
function recolorIcon(img: HTMLImageElement, color: string, px: number): ImageData {
  // Recolour the icon on its own canvas (source-in keeps the alpha shape).
  const tmp = document.createElement("canvas");
  tmp.width = px;
  tmp.height = px;
  const tctx = tmp.getContext("2d")!;
  tctx.drawImage(img, 0, 0, px, px);
  tctx.globalCompositeOperation = "source-in";
  tctx.fillStyle = color;
  tctx.fillRect(0, 0, px, px);

  // Composite: white disc background, then the recoloured icon on top.
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(px / 2, px / 2, px / 2 - 2, 0, Math.PI * 2); // inset 2px to avoid a white rim
  ctx.fill();
  ctx.drawImage(tmp, 0, 0);
  return ctx.getImageData(0, 0, px, px);
}
const STOP_ICON_PX = 96; // source raster size (→ 48 logical px at pixelRatio 2)

// (Re)register one recoloured pin image per line colour. setStyle wipes images,
// so this runs again on every basemap swap.
function registerStopImages(map: maplibregl.Map, img: HTMLImageElement) {
  for (const color of STOP_PIN_COLORS) {
    const name = stopImageName(color);
    if (map.hasImage(name)) map.removeImage(name);
    map.addImage(name, recolorIcon(img, color, STOP_ICON_PX), { pixelRatio: 2 });
  }
}

function busTimeAgo(iso: string | null): string {
  if (!iso) return "—";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "~15 секунди доцни сигналот од автобусот";
  if (min < 60) return `пред ${min} мин`;
  return `пред ${Math.round(min / 60)} ч`;
}

// Marker: a coloured rounded pill carrying a white circle with the line number
// and the bus photo (public/bus.png), matching the requested design.
function makeBusEl(short: string, color: string): BusEls {
  const root = document.createElement("div");
  root.style.cssText = "cursor:pointer;";

  const pill = document.createElement("div");
  // Built at the largest (zoomed-in) size; markerScale() only ever shrinks it,
  // which keeps every part of the pill sharp at all zoom levels.
  pill.style.cssText =
    "display:flex;align-items:center;gap:8px;padding:6px 16px 6px 6px;" +
    `border-radius:999px;background:${color};border:3px solid #fff;` +
    "box-shadow:0 2px 8px rgba(0,0,0,0.3);transform-origin:center;will-change:transform;";

  const circle = document.createElement("span");
  circle.style.cssText =
    "display:flex;align-items:center;justify-content:center;width:36px;height:36px;" +
    "flex:0 0 auto;border-radius:999px;background:#fff;font:800 22px/1 system-ui,sans-serif;";
  const numEl = document.createElement("span");
  numEl.textContent = short;
  numEl.style.color = color;
  circle.appendChild(numEl);

  const img = document.createElement("img");
  img.src = "/bus.png";
  img.alt = "";
  img.draggable = false;
  img.style.cssText = "height:24px;width:auto;display:block;flex:0 0 auto;";

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
  // Loaded stop-pin image (public/bus-stop.svg). Held in a ref so it can be
  // (re-)registered with the map after every basemap swap (setStyle wipes images).
  const stopImgRef = useRef<HTMLImageElement | null>(null);
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
        // Each line sits in its own lane (constant px offset) so shared roads
        // render as parallel ribbons rather than one line hiding the others.
        const offset = laneOffset(route.id);
        // White halo so routes are legible over the basemap
        if (!map.getLayer(`route-${route.id}-halo`)) {
          map.addLayer({
            id: `route-${route.id}-halo`,
            type: "line",
            source: `route-${route.id}`,
            layout: { "line-join": "round", "line-cap": "round", visibility: vis },
            paint: {
              "line-color": "#ffffff",
              "line-width": 8,
              "line-opacity": 0.7,
              "line-offset": offset,
            },
          });
        }
        if (!map.getLayer(`route-${route.id}-line`)) {
          map.addLayer({
            id: `route-${route.id}-line`,
            type: "line",
            source: `route-${route.id}`,
            layout: { "line-join": "round", "line-cap": "round", visibility: vis },
            paint: { "line-color": route.color, "line-width": 5, "line-offset": offset },
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
              properties: {
                id: stop.id,
                name: stop.name,
                routeIds: stop.routeIds.join(","),
                pinImg: stopImageName(stopPinColor(stop)),
              },
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

      // Stop pins (public/bus-stop.svg), one image per line colour. Re-register
      // them here since setStyle wipes images, then a symbol layer that picks its
      // image per-feature by line colour and grows as you zoom in.
      const stopImg = stopImgRef.current;
      if (stopImg) registerStopImages(map, stopImg);
      if (!map.getLayer("stops-sym")) {
        map.addLayer({
          id: "stops-sym",
          type: "symbol",
          source: "bus-stops",
          layout: {
            "icon-image": ["get", "pinImg"],
            "icon-anchor": "center", // round icon sits centred on the stop coordinate
            "icon-allow-overlap": true,
            "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.35, 14, 0.56, 16, 1.0],
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
      map.setFilter("stops-sym", stopFilter);
    };

    // Stop hover/click + background-click handlers. Bound once to the map (they
    // survive style swaps), keyed by layer id which addOverlays re-creates.
    const registerInteractions = () => {
      // Bind to both the invisible tap target AND the pin itself, since the pin
      // is anchored at its tip — its head sits above the hit circle.
      const STOP_LAYERS = ["stops-hit", "stops-sym"];
      for (const layer of STOP_LAYERS) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      const onStopClick = (e: maplibregl.MapLayerMouseEvent) => {
        if (!e.features?.length) return;
        const props = e.features[0].properties as { name: string; routeIds: string };
        const coords = (
          e.features[0].geometry as GeoJSON.Point
        ).coordinates.slice(0, 2) as [number, number];

        // Which routes serve this stop? Colour the card by the first (matching
        // the pin colour); list every serving line beneath the name.
        const routes = props.routeIds
          .split(",")
          .map((rid) => BUS_ROUTES.find((r) => r.id === rid))
          .filter((r): r is (typeof BUS_ROUTES)[number] => !!r);
        const color = routes[0]?.color ?? "#3b82f6";
        const lines = routes.map((r) => r.name).join(" · ");
        const icon = `<svg viewBox="${STOP_ICON_VIEWBOX}" width="34" height="34" fill="${color}" style="flex:0 0 auto;">${STOP_ICON_INNER}</svg>`;

        popupRef.current?.remove();
        setSelectedBusId(null); // opening a stop popup closes the bus panel
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          anchor: "bottom", // sit above the stop, tip pointing down
          offset: 26,
          maxWidth: "260px",
          className: "pp-map-popup",
        })
          .setLngLat(coords)
          .setHTML(
            `<div style="display:flex;align-items:center;gap:10px;padding:12px 16px 12px 12px;font-family:inherit;">
              ${icon}
              <div style="display:flex;flex-direction:column;line-height:1.2;min-width:0;">
                <span style="font-size:16px;font-weight:800;color:${color};">${props.name}</span>
                <span style="font-size:13px;font-weight:600;color:#52525b;">${lines}</span>
              </div>
            </div>`,
          )
          .addTo(map);
      };
      map.on("click", "stops-hit", onStopClick);
      map.on("click", "stops-sym", onStopClick);

      // Dismiss popup when clicking the map background
      map.on("click", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: STOP_LAYERS });
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
        // Generate stop-pin images on demand. Covers the production cold-load
        // race where the basemap style finishes before /bus-stop.svg, so the
        // symbol layer asks for an icon that isn't registered yet. Bound once —
        // it survives basemap swaps.
        map.on("styleimagemissing", (e) => {
          const id = e.id;
          if (!id.startsWith(STOP_IMG_PREFIX) || map.hasImage(id)) return;
          const src = stopImgRef.current;
          if (!src) return; // SVG not loaded yet — the load handler re-resolves
          const color = id.slice(STOP_IMG_PREFIX.length);
          map.addImage(id, recolorIcon(src, color, STOP_ICON_PX), { pixelRatio: 2 });
        });
        // Frame the whole network and make that the zoom-out floor.
        map.fitBounds(FIT_BOUNDS, { padding: 24, duration: 0 });
        // Floor a bit tighter than the full-network fit so the map can't be
        // zoomed out into empty surroundings past where the buses run.
        map.setMinZoom(map.getZoom() + 0.7);
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

  // ── Load the stop-pin image once, then register it with the map ─────────────
  // Kept in a ref so addOverlays can re-register it after each basemap swap.
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      stopImgRef.current = img;
      const map = mapRef.current;
      if (map && map.isStyleLoaded()) {
        registerStopImages(map, img);
        // Force the symbol layer to re-resolve its icons. If the basemap loaded
        // before the SVG (the prod cold-load race), the stops were laid out as
        // "image missing" and styleimagemissing won't re-fire for those ids —
        // re-setting the layout property re-lays them out now the images exist.
        if (map.getLayer("stops-sym")) {
          map.setLayoutProperty("stops-sym", "icon-image", ["get", "pinImg"]);
        }
        map.triggerRepaint();
      }
    };
    img.src = "/bus-stop.svg";
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
    if (map.getLayer("stops-sym")) {
      const activeIds = BUS_STOPS.filter((s) =>
        s.routeIds.some((rid) => activeRoutes.has(rid)),
      ).map((s) => s.id);

      const filter: maplibregl.FilterSpecification = [
        "in",
        ["get", "id"],
        ["literal", activeIds],
      ];
      map.setFilter("stops-hit", filter);
      map.setFilter("stops-sym", filter);
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
      if (document.hidden) {
        stop();
      } else {
        // Returning after the tab/app was hidden: rAF was paused, so the
        // animation state is stale. Drop it so the next fix places each bus
        // instantly at its real spot instead of "catching up" with a long,
        // wrong tween across the map.
        busStateRef.current.clear();
        start();
      }
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
  // When live, the glyph gently bobs toward the next stop (paired with the
  // flowing rail) to read as "on its way"; offline it sits still.
  const busNode = (color: string, bus: LiveBus, animate: boolean) => (
    <div className="flex min-h-10 items-center gap-2.5">
      <span className="relative z-1 flex w-6 shrink-0 justify-center">
        <span
          className={`flex h-7.5 w-7.5 items-center justify-center rounded-full ${
            animate ? "pp-bus-bob" : ""
          }`}
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
    // Resolve prev/next from the nearest point on the line regardless of how far
    // the raw fix sits from the polyline — otherwise GPS jitter blanks the stops.
    const forward =
      snap && geom && bus.course != null
        ? angleDiff(bearingAt(geom, snap.along, true), bus.course) <= 90
        : true;
    const { prev, next } = snap
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
          {/* Connector rail: live → a downward-flowing gradient in the line's
              colour (lighter → full); offline → a plain grey line. */}
          {offline ? (
            <div className="absolute left-6.75 top-4 bottom-4 w-0.5 bg-zinc-200" />
          ) : (
            <div
              className="pp-rail-flow absolute left-6.75 top-4 bottom-4 w-0.5"
              style={
                {
                  "--line": baseColor,
                  "--line-light": tint(baseColor, 0.6),
                } as CSSProperties
              }
            />
          )}
          {stopNode(offline ? GREY : "#cbd5e1", 11, prev, false)}
          {busNode(color, bus, !offline)}
          {stopNode(offline ? GREY : baseColor, 13, next, true)}
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

          {[...liveBuses]
            .sort((a, b) => {
              // Order the chips by line number (Линија 1, 2, 3…), not by the
              // arbitrary order the live-positions feed returns buses in.
              const ai = BUS_ROUTES.findIndex((r) => r.id === a.routeId);
              const bi = BUS_ROUTES.findIndex((r) => r.id === b.routeId);
              return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
            })
            .map((bus) => {
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
            <div className="pp-panel-left absolute top-0 bottom-0 left-3 z-40 my-auto hidden h-fit max-h-[calc(100%-1.5rem)] w-60 overflow-y-auto rounded-2xl border border-white/60 bg-linear-to-b from-white/85 to-white/55 shadow-xl ring-1 ring-white/40 backdrop-blur-2xl lg:block">
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
