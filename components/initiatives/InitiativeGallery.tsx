"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "../../lib/utils";
import GalleryLightbox from "../ui/GalleryLightbox";

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
        <GalleryLightbox
          images={images}
          startIndex={viewerAt}
          onClose={() => setViewerAt(null)}
          onIndexChange={setActive}
        />
      )}
    </div>
  );
}
