"use client";

import { useRef, useState } from "react";
import { cdnUrl } from "../../lib/utils";

interface Props {
  beforeSrc: string;
  afterSrc: string;
  alt?: string;
  className?: string;
  /** Maximum height for the slider area (CSS value). Default 88vh. */
  maxHeight?: string;
  /** Show small "Пред / Потоа" labels in the corners. Default false. */
  showLabels?: boolean;
}

/**
 * Interactive before/after image comparison.
 *
 * Both images are anchored to the same rect (absolute, inset-0) and use
 * object-contain so nothing is cropped. The "Потоа" image sits in the
 * normal flow and sets the container's size; the "Пред" image overlays
 * the same rect and is clipped from the right by the slider position.
 */
export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  alt = "",
  className = "",
  maxHeight = "88vh",
  showLabels = false,
}: Props) {
  const [pos, setPos] = useState(50); // percentage 0–100
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

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
      className={`relative inline-block select-none touch-none align-middle ${className}`}>
      {/* "Потоа" — drives the container's natural size */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cdnUrl(afterSrc)}
        alt={`${alt} — Потоа`}
        draggable={false}
        className="block max-w-full pointer-events-none"
        style={{ maxHeight }}
      />

      {/* "Пред" — overlay matched exactly to the after image's rect */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cdnUrl(beforeSrc)}
          alt={`${alt} — Пред`}
          draggable={false}
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
            <path d="M2 8L6 4M2 8L6 12M2 8H14M14 8L10 4M14 8L10 12" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
