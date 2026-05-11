"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { X, MapPin, Loader2 } from "lucide-react";
import { type Street, matchStreet, prettyStreetName } from "../../lib/data/streets";

interface Props {
  initialLat?: number | null;
  initialLng?: number | null;
  onClose: () => void;
  /**
   * Called when the user clicks "Зачувај локација".
   * `street` is the reverse-geocoded street name (best-effort, may be empty).
   * `matched` is the canonical Street entry (if found in the local DB) —
   * lets the parent auto-fill district etc.
   */
  onConfirm: (
    lat: number,
    lng: number,
    street: string,
    matched: Street | null,
  ) => void;
}

interface NominatimReverse {
  address?: {
    road?: string;
    pedestrian?: string;
    footway?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
  };
  display_name?: string;
}

/**
 * Reverse-geocode lat/lng → CANONICAL Prilep street name.
 *
 * Nominatim's data for Prilep is messy (combines old + new names, has typos,
 * inconsistent casing). We never trust its raw output. Instead:
 *   1. Pull the road name (or pedestrian/footway fallback) from OSM.
 *   2. Run it through `matchStreet()` which normalizes against the local
 *      canonical street DB (handles old names, parenthesized variants,
 *      hyphenated joins, prefixes).
 *   3. Return the canonical name if a confident match is found.
 *   4. Otherwise return empty string — we'd rather show nothing than
 *      pollute the form with bad data.
 */
interface GeocodeResult {
  display: string;          // What to show / save in the form
  matched: Street | null;   // Canonical Street entry from local DB
}

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeocodeResult> {
  const empty: GeocodeResult = { display: "", matched: null };
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1&accept-language=mk`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "mk,en" },
    });
    if (!res.ok) return empty;
    const data: NominatimReverse = await res.json();
    const rawRoad =
      data.address?.road ||
      data.address?.pedestrian ||
      data.address?.footway ||
      "";
    if (!rawRoad) return empty;

    const matched = matchStreet(rawRoad);
    if (!matched) return empty;

    const canonical = prettyStreetName(matched.name);
    const house = data.address?.house_number;
    return {
      display: house ? `${canonical} ${house}` : canonical,
      matched,
    };
  } catch {
    return empty;
  }
}

// Center of Prilep (approx)
const PRILEP_CENTER: [number, number] = [21.5551, 41.3458];

/**
 * Fullscreen map modal that lets the user drop a draggable pin. Uses
 * MapLibre GL JS with the free OpenFreeMap "positron" vector style —
 * no API key, no usage limits, no cost.
 */
export default function LocationPickerModal({
  initialLat,
  initialLng,
  onClose,
  onConfirm,
}: Props) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<[number, number]>(
    initialLat != null && initialLng != null
      ? [initialLng, initialLat]
      : PRILEP_CENTER,
  );
  const [detectedStreet, setDetectedStreet] = useState<string>("");
  const [detectedMatch, setDetectedMatch] = useState<Street | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  // Token used to cancel stale reverse-geocode requests when the pin moves
  const geocodeToken = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: coords,
      zoom: initialLat ? 16 : 13,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const marker = new maplibregl.Marker({
      color: "#0d9488",
      draggable: true,
    })
      .setLngLat(coords)
      .addTo(map);

    marker.on("dragend", () => {
      const ll = marker.getLngLat();
      setCoords([ll.lng, ll.lat]);
    });

    // Tap-to-move on the map
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      setCoords([e.lngLat.lng, e.lngLat.lat]);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // We only want to initialize the map once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced reverse-geocode whenever the pin position changes
  useEffect(() => {
    const myToken = ++geocodeToken.current;
    const id = setTimeout(async () => {
      setGeocoding(true);
      const result = await reverseGeocode(coords[1], coords[0]);
      // Drop the result if the user has moved the pin again since
      if (myToken !== geocodeToken.current) return;
      setDetectedStreet(result.display);
      setDetectedMatch(result.matched);
      setGeocoding(false);
    }, 500);
    return () => clearTimeout(id);
  }, [coords]);

  // Lock body scroll while open + close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl h-[80vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              Прецизно обележи на мапа
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Затвори"
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100">
            <X size={16} />
          </button>
        </div>

        {/* Map */}
        <div ref={containerRef} className="flex-1 relative" />

        {/* Footer with detected address + actions */}
        <div className="border-t border-zinc-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-zinc-500 leading-snug">
              Влечете го pinот или кликнете на мапата.
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
              {geocoding ? (
                <>
                  <Loader2 size={11} className="animate-spin text-zinc-400 shrink-0" />
                  <span className="text-[11px] text-zinc-400">
                    Се пребарува улицата…
                  </span>
                </>
              ) : detectedStreet ? (
                <>
                  <MapPin size={11} className="text-teal-600 shrink-0" />
                  <span className="text-[11px] font-medium text-slate-700 truncate">
                    {detectedStreet}
                  </span>
                </>
              ) : (
                <span className="font-mono text-[10px] text-zinc-400">
                  {coords[1].toFixed(5)}, {coords[0].toFixed(5)}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-zinc-50">
              Откажи
            </button>
            <button
              type="button"
              onClick={() =>
                onConfirm(coords[1], coords[0], detectedStreet, detectedMatch)
              }
              className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700">
              Зачувај локација
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
