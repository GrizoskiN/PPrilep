"use client";

import { useState } from "react";

import GalleryLightbox from "../ui/GalleryLightbox";
import { cn } from "../../lib/utils";

/**
 * The event detail cover, made zoomable.
 *
 * The cover is `object-cover` in a fixed-height band, which crops tall posters —
 * fine as a banner, useless when the cropped strip is the part carrying the
 * date and venue. Clicking now opens the full image, uncropped, and any extra
 * gallery photos are reachable from the same viewer.
 *
 * `children` is the category badge the page overlays on the banner; it stays a
 * server-rendered node passed through, so this component only owns the zoom.
 */
export default function EventCover({
  src,
  full,
  alt,
  gallery = [],
  children,
}: {
  /** Banner-sized URL. */
  src: string;
  /** Full-size URL opened in the viewer. */
  full: string;
  alt: string;
  /** Extra full-size photos, shown after the cover in the viewer. */
  gallery?: { thumb: string; full: string; alt: string }[];
  children?: React.ReactNode;
}) {
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const all = [full, ...gallery.map((g) => g.full)];

  return (
    <>
      <div className="relative h-56 w-full sm:h-72">
        <button
          type="button"
          onClick={() => setViewerAt(0)}
          aria-label="Отвори ја сликата"
          className="block h-full w-full cursor-zoom-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        </button>
        {children}
      </div>

      {gallery.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-3">
          {gallery.map((g, i) => (
            <button
              key={g.full}
              type="button"
              // +1 — index 0 in the viewer is the cover itself.
              onClick={() => setViewerAt(i + 1)}
              aria-label={`Слика ${i + 2}`}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-transparent",
                "transition-colors hover:border-primary",
              )}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.thumb} alt={g.alt} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {viewerAt !== null && (
        <GalleryLightbox
          images={all}
          startIndex={viewerAt}
          onClose={() => setViewerAt(null)}
          onIndexChange={() => {}}
        />
      )}
    </>
  );
}
