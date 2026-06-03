"use client";

import Image from "next/image";
import { useState } from "react";
import { Expand } from "lucide-react";
import ImageLightbox from "../ui/ImageLightbox";

interface Props {
  /** Cropped display URL (sized for the card). */
  src: string;
  /** Full-resolution URL opened in the lightbox. */
  fullSrc: string;
  alt: string;
}

/**
 * Cover image that opens a fullscreen lightbox on click — since the inline
 * image is cropped to keep the card layout consistent, this lets readers see
 * the whole photo.
 */
export default function ClickableCover({ src, fullSrc, alt }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Зголеми ја сликата"
        className="group relative my-4 block aspect-[16/9] w-full overflow-hidden rounded-2xl bg-zinc-100 cursor-zoom-in">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 624px"
          priority
          className="object-cover"
        />
        <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <Expand size={15} />
        </span>
      </button>

      {open && <ImageLightbox src={fullSrc} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}
