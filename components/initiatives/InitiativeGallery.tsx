"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Hero image + thumbnail slider for an initiative's progress/completion photos.
 * Clicking the hero opens a full-screen lightbox with arrow-key navigation.
 * A single image renders as just the (clickable) hero.
 */
export default function InitiativeGallery({
  images,
  alt = "",
}: {
  images: string[];
  alt?: string;
}) {
  const [active, setActive] = useState(0);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  if (!images || images.length === 0) return null;

  const safe = Math.min(active, images.length - 1);
  const hero = images[safe];

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setViewerAt(safe)}
        className="relative block w-full h-56 sm:h-72 rounded-xl overflow-hidden bg-zinc-100 cursor-zoom-in">
        <Image
          src={hero}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 640px"
          className="object-cover"
        />
      </button>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Слика ${i + 1}`}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                i === active ? "border-primary" : "border-transparent",
              )}>
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {viewerAt !== null && (
        <Lightbox
          images={images}
          startIndex={viewerAt}
          onClose={() => setViewerAt(null)}
          onIndexChange={setActive}
        />
      )}
    </div>
  );
}

// ── Full-screen viewer ───────────────────────────────────────────────────────

function Lightbox({
  images,
  startIndex,
  onClose,
  onIndexChange,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const [i, setI] = useState(startIndex);

  const prev = useCallback(
    () => setI((v) => (v - 1 + images.length) % images.length),
    [images.length],
  );
  const next = useCallback(
    () => setI((v) => (v + 1) % images.length),
    [images.length],
  );

  useEffect(() => {
    onIndexChange(i);
  }, [i, onIndexChange]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, prev, next]);

  const many = images.length > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95"
      onClick={onClose}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Затвори"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
        <X size={20} />
      </button>

      {many && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Претходна"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Следна"
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
            <ChevronRight size={22} />
          </button>
        </>
      )}

      <div
        className="relative h-full w-full max-h-screen max-w-screen-lg"
        onClick={(e) => e.stopPropagation()}>
        <Image
          key={images[i]}
          src={images[i]}
          alt=""
          fill
          sizes="100vw"
          className="object-contain"
          priority
        />
      </div>

      {many && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
          {i + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
