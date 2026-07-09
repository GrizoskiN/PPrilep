"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { X } from "lucide-react";
import {
  GLASS_CONTAINERS,
  type GlassContainer,
} from "../../lib/data/glassContainers";
import { COOPERATIVE_MAP_OPTIONS } from "../../lib/map/cooperative";

// Glass containers are all one type — shown as blue dots.
const GLASS_BLUE = "#3b82f6";

// Prilep bounding box — users can't pan outside the city (same lock the issue map
// and bus map use).
const PRILEP_BOUNDS: [[number, number], [number, number]] = [
  [21.44, 41.28], // SW
  [21.67, 41.42], // NE
];

function createMarkerEl() {
  // Fixed 28px hit area so hover never flickers when the inner dot scales up.
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    width:28px;height:28px;
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    width:12px;height:12px;border-radius:50%;
    background:${GLASS_BLUE};
    border:2px solid #fff;
    box-shadow:0 1px 6px rgba(0,0,0,0.3);
    transition:transform 0.12s ease, box-shadow 0.12s ease;
    pointer-events:none;
  `;

  wrapper.appendChild(dot);
  wrapper.addEventListener("mouseenter", () => {
    dot.style.transform = "scale(1.5)";
  });
  wrapper.addEventListener("mouseleave", () => {
    dot.style.transform = "scale(1)";
  });
  return wrapper;
}

export default function GlassContainerMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [selected, setSelected] = useState<GlassContainer | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [21.5551, 41.3458],
      zoom: 13,
      minZoom: 11,
      maxZoom: 19,
      maxBounds: PRILEP_BOUNDS,
      attributionControl: { compact: true },
      ...COOPERATIVE_MAP_OPTIONS,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Drop all container markers once the map exists
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    GLASS_CONTAINERS.forEach((c) => {
      const el = createMarkerEl();
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([c.lng, c.lat])
        .addTo(map);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelected(c);
      });
      markersRef.current.push(marker);
    });
  }, []);

  const popupCard = selected && (
    <>
      {selected.photos && selected.photos.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={selected.photos[0]}
          alt={selected.name}
          className="h-32 w-full object-cover"
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: GLASS_BLUE }}
              />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                ♻️ Стакло
              </p>
            </div>
            <p className="text-sm font-semibold leading-snug text-zinc-800">
              {selected.name}
            </p>
          </div>
          <button
            onClick={() => setSelected(null)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100"
            aria-label="Затвори">
            <X size={13} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full border-2 border-white shadow"
            style={{ background: GLASS_BLUE }}
          />
          Контејнер за стакло
        </span>
      </div>

      {/* Map frame */}
      <div className="relative h-125 overflow-hidden rounded-2xl border border-zinc-200">
        <div
          ref={containerRef}
          className="h-full w-full"
          onClick={() => setSelected(null)}
        />

        {/* Container popup — left-docked & vertically centered on desktop
            (soft slide-in from the left), bottom drawer on mobile.
            Mirrors the bus map's pp-panel-left / pp-panel-up behavior. */}
        {selected && (
          <>
            {/* Desktop: left middle */}
            <div
              className="pp-panel-left absolute top-0 bottom-0 left-3 z-20 my-auto hidden h-fit w-72 max-w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-2xl lg:block"
              onClick={(e) => e.stopPropagation()}>
              {popupCard}
            </div>
            {/* Mobile: bottom drawer */}
            <div
              className="pp-panel-up absolute right-4 bottom-4 left-4 z-20 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-2xl lg:hidden"
              onClick={(e) => e.stopPropagation()}>
              {popupCard}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
