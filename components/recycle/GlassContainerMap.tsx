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

// Glass = blue. New July-2026 Iglu units get a slightly stronger blue + a ring
// so they read as "new", but stay in the same blue family per the brief.
const GLASS_BLUE = "#3b82f6";
const IGLU_BLUE = "#2563eb";

// Prilep bounding box — users can't pan outside the city (same lock the issue map
// and bus map use).
const PRILEP_BOUNDS: [[number, number], [number, number]] = [
  [21.44, 41.28], // SW
  [21.67, 41.42], // NE
];

function createMarkerEl(isIglu: boolean) {
  const color = isIglu ? IGLU_BLUE : GLASS_BLUE;
  const size = isIglu ? 15 : 12;

  // Fixed 28px hit area so hover never flickers when the inner dot scales up.
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    width:28px;height:28px;
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};
    border:${isIglu ? "2.5px solid #fff" : "2px solid #fff"};
    box-shadow:0 1px 6px rgba(0,0,0,0.3)${isIglu ? `,0 0 0 2px ${IGLU_BLUE}` : ""};
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
      const el = createMarkerEl(c.kind === "iglu");
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

  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full border-2 border-white shadow"
            style={{ background: GLASS_BLUE }}
          />
          Стакло — постоен контејнер
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white shadow"
            style={{ background: IGLU_BLUE, boxShadow: `0 0 0 2px ${IGLU_BLUE}` }}
          />
          Нов „Иглу“ контејнер (јули 2026)
        </span>
      </div>

      {/* Map frame */}
      <div className="relative h-125 overflow-hidden rounded-2xl border border-zinc-200">
        <div
          ref={containerRef}
          className="h-full w-full"
          onClick={() => setSelected(null)}
        />

        {/* Container popup */}
        {selected && (
          <div
            className="absolute bottom-6 left-1/2 z-20 w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
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
                      style={{
                        background:
                          selected.kind === "iglu" ? IGLU_BLUE : GLASS_BLUE,
                      }}
                    />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                      ♻️ Стакло{selected.kind === "iglu" ? " · Иглу" : ""}
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
          </div>
        )}
      </div>
    </div>
  );
}
