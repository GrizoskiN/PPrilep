"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { cdnUrl } from "../../lib/utils";

interface BlurImageProps extends Omit<ImageProps, "placeholder" | "blurDataURL"> {
  rounded?: string; // tailwind rounding class for the wrapper, e.g. "rounded-lg"
  wrapperClassName?: string;
}

// Tiny 8x8 SVG used as a blurred placeholder while the real image loads.
// Inline so it costs nothing to render and matches the teal/zinc palette.
const SHIMMER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0%" stop-color="#e5e7eb"/><stop offset="50%" stop-color="#f4f4f5"/><stop offset="100%" stop-color="#e5e7eb"/></linearGradient></defs><rect width="8" height="8" fill="url(#g)"/></svg>`;

const BLUR_DATA_URL = `data:image/svg+xml;base64,${
  typeof window === "undefined"
    ? Buffer.from(SHIMMER_SVG).toString("base64")
    : btoa(SHIMMER_SVG)
}`;

/**
 * Drop-in replacement for next/image that shows an animated shimmer until
 * the real image loads, then fades it in. Always uses Next.js image
 * optimization (no unoptimized) so mobile gets responsive WebP/AVIF.
 */
export default function BlurImage({
  className = "",
  rounded = "",
  wrapperClassName = "",
  alt,
  onLoad,
  src,
  ...rest
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);

  // Route Supabase storage URLs through the CDN automatically
  const finalSrc = typeof src === "string" ? cdnUrl(src) : src;

  return (
    <div
      className={`relative overflow-hidden ${rounded} ${wrapperClassName}`.trim()}>
      {!loaded && (
        <div
          aria-hidden
          className={`absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-100 ${rounded}`}
        />
      )}
      <Image
        {...rest}
        src={finalSrc}
        alt={alt}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        className={`${className} transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`.trim()}
      />
    </div>
  );
}
