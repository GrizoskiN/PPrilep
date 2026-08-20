"use client";

import Image from "next/image";
import { useState } from "react";
import { Expand } from "lucide-react";
import ImageLightbox from "../ui/ImageLightbox";

export interface GalleryItem {
  /** Cropped thumbnail URL (sized for the grid). */
  src: string;
  /** Full-resolution URL opened in the lightbox. */
  fullSrc: string;
  alt: string;
  caption: string | null;
}

interface Props {
  items: GalleryItem[];
}

/**
 * Photo gallery for Позитива posts. Renders a responsive grid of thumbnails;
 * clicking any photo opens it full-size in the shared lightbox.
 */
export default function PostGallery({ items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  const active = openIndex !== null ? items[openIndex] : null;

  return (
    <section className="my-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item, i) => (
          <figure key={item.fullSrc} className="space-y-1">
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label="Зголеми ја сликата"
              className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 cursor-zoom-in">
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(max-width: 640px) 50vw, 200px"
                className="object-cover transition-transform group-hover:scale-105"
              />
              <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <Expand size={13} />
              </span>
            </button>
            {item.caption && (
              <figcaption className="text-[11px] text-zinc-500 leading-snug px-0.5">
                {item.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {active && (
        <ImageLightbox
          src={active.fullSrc}
          alt={active.alt}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}
