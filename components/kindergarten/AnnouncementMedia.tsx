"use client";

import { useState } from "react";
import Image from "next/image";
import GalleryLightbox from "../ui/GalleryLightbox";

/**
 * Zoomable media for a kindergarten announcement: a big cover banner and/or a
 * gallery grid, all opening the same full-screen viewer (full width + height).
 * Video is rendered by the page itself and stays out of the viewer.
 */
export default function AnnouncementMedia({
  cover,
  gallery,
  alt,
}: {
  /** Cover as { thumb, full }, or null when the post leads with video/gallery only. */
  cover: { thumb: string; full: string } | null;
  /** Gallery images as { thumb, full }. */
  gallery: { thumb: string; full: string }[];
  alt: string;
}) {
  const [viewerAt, setViewerAt] = useState<number | null>(null);

  // The viewer shows the cover first (if any), then every gallery image.
  const all = [...(cover ? [cover.full] : []), ...gallery.map((g) => g.full)];
  const galleryOffset = cover ? 1 : 0;

  return (
    <>
      {cover && (
        <button
          type="button"
          onClick={() => setViewerAt(0)}
          aria-label="Отвори ја сликата"
          className="relative block h-56 w-full cursor-zoom-in sm:h-72">
          <Image
            src={cover.thumb}
            alt={alt} fill sizes="(max-width: 640px) 100vw, 1200px"
            className="object-cover" priority
          />
        </button>
      )}

      {gallery.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {gallery.map((g, i) => (
            <button
              key={g.full}
              type="button"
              onClick={() => setViewerAt(galleryOffset + i)}
              aria-label={`Слика ${i + 1}`}
              className="relative block aspect-[4/3] cursor-zoom-in overflow-hidden rounded-xl bg-zinc-50">
              <Image
                src={g.thumb}
                alt={`${alt} ${i + 1}`} fill
                sizes="(max-width: 640px) 100vw, 50vw" className="object-cover"
              />
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
