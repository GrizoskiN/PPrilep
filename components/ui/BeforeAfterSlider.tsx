"use client";

import { useRef, useState } from "react";
import { cdnUrl } from "../../lib/utils";

interface Props {
  beforeSrc: string;
  afterSrc: string;
  alt?: string;
  className?: string;
  /** Maximum height for the slider area (CSS value). Default 70vh. */
  maxHeight?: string;
  /** Show small "Пред / Потоа" labels in the corners. Default false. */
  showLabels?: boolean;
}

/**
 * Interactive before/after image comparison.
 *
 * Container aspect-ratio = max(beforeAspect, afterAspect) — i.e., the
 * wider photo's shape, capped at `maxHeight`. Both images use
 * `object-contain` so neither is cropped: the wider photo fits the
 * container exactly; the narrower (taller) photo is centered inside the
 * same box and the leftover area shows the black backdrop.
 */
export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  alt = "",
  className = "",
  maxHeight = "70vh",
  showLabels = false,
}: Props) {
  const [pos, setPos] = useState(50); // percentage 0–100
  const [beforeAspect, setBeforeAspect] = useState<number | null>(null);
  const [afterAspect, setAfterAspect] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Lock the container to the WIDER of the two aspects (max w/h). With
  // object-contain on both images, the wider photo fits perfectly and
  // the narrower (taller) one is letterboxed left/right inside the same
  // box — leftover area is the black backdrop.
  // Falls back to 4:3 while images are still loading.
  const targetAspect =
    beforeAspect && afterAspect
      ? Math.max(beforeAspect, afterAspect)
      : (afterAspect ?? beforeAspect ?? 4 / 3);

  function update(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setPos(pct);
  }

  function onPointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    update(e.clientX);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    update(e.clientX);
  }
  function onPointerUp() {
    draggingRef.current = false;
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`relative select-none touch-none w-full mx-auto bg-black overflow-hidden ${className}`}
      style={{ aspectRatio: targetAspect, maxHeight }}>
      {/* "Потоа" — fills the locked-aspect container */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cdnUrl(afterSrc)}
        alt={`${alt} — Потоа`}
        draggable={false}
        onLoad={(e) =>
          setAfterAspect(
            e.currentTarget.naturalWidth / e.currentTarget.naturalHeight,
          )
        }
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />

      {/* "Пред" — overlay clipped to the left of the divider */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cdnUrl(beforeSrc)}
          alt={`${alt} — Пред`}
          draggable={false}
          onLoad={(e) =>
            setBeforeAspect(
              e.currentTarget.naturalWidth / e.currentTarget.naturalHeight,
            )
          }
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      {showLabels && (
        <>
          <span className="absolute top-2 left-2 z-10 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white pointer-events-none">
            Пред
          </span>
          <span className="absolute top-2 right-2 z-10 rounded-md bg-teal-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white pointer-events-none">
            Потоа
          </span>
        </>
      )}

      {/* Divider line + handle */}
      <div
        className="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)] pointer-events-none"
        style={{ left: `calc(${pos}% - 1px)` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 8L6 4M2 8L6 12M2 8H14M14 8L10 4M14 8L10 12"
              stroke="#0f172a"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
