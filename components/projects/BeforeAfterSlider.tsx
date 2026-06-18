"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

interface Props {
  beforeUrl: string;
  afterUrl: string;
  beforeAlt?: string;
  afterAlt?: string;
  label?: string | null;
}

/**
 * Drag-to-reveal before/after comparison. The "after" image is the base layer;
 * the "before" image is clipped from the right and revealed by dragging the
 * vertical handle (pointer + touch). A visually-hidden range input keeps it
 * keyboard-accessible.
 */
export default function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeAlt,
  afterAlt,
  label,
}: Props) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }, []);

  return (
    <figure className="my-4">
      <div
        ref={ref}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) setFromClientX(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        className="relative aspect-[4/3] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-2xl border border-[#e4ece8] bg-slate-100">
        {/* After (base layer) */}
        <Image
          src={afterUrl}
          alt={afterAlt ?? "Потоа"}
          fill
          sizes="(max-width: 640px) 100vw, 600px"
          className="object-cover"
          draggable={false}
        />
        {/* Before (clipped from the right by the handle position) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <Image
            src={beforeUrl}
            alt={beforeAlt ?? "Пред"}
            fill
            sizes="(max-width: 640px) 100vw, 600px"
            className="object-cover"
            draggable={false}
          />
        </div>

        {/* Corner labels */}
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
          Пред
        </span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
          Потоа
        </span>

        {/* Handle */}
        <div
          className="pointer-events-none absolute inset-y-0"
          style={{ left: `${pos}%`, transform: "translateX(-50%)" }}>
          <div className="mx-auto h-full w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
          <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-700 shadow-md ring-1 ring-black/10">
            ⇄
          </div>
        </div>

        {/* Keyboard accessibility */}
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Лизгач пред / потоа"
          className="absolute bottom-2 left-1/2 w-2/3 -translate-x-1/2 opacity-0"
        />
      </div>
      {label && (
        <figcaption className="mt-1.5 text-center text-xs text-zinc-500">
          {label}
        </figcaption>
      )}
    </figure>
  );
}
