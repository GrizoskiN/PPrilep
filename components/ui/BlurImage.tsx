"use client";

import Image, { ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
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
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Route Supabase storage URLs through the CDN automatically
  const finalSrc = typeof src === "string" ? cdnUrl(src) : src;

  // If the image is already complete (e.g. from browser cache) when we mount,
  // onLoad will not fire — detect that and flip `loaded` ourselves so the
  // image isn't stuck at opacity-0 / behind the skeleton.
  useEffect(() => {
    const img = wrapperRef.current?.querySelector("img");
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [finalSrc]);

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden ${rounded} ${wrapperClassName}`.trim()}>
      {!loaded && (
        <div
          aria-hidden
          className={`absolute inset-0 animate-pulse bg-linear-to-br from-zinc-100 via-zinc-50 to-zinc-100 ${rounded}`}
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
        onError={() => {
          // If the optimized image fails (e.g. CDN cert pending), unhide
          // it anyway so the user at least sees the broken-image icon
          // instead of a permanent gray skeleton.
          setLoaded(true);
        }}
        className={`${className} transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`.trim()}
      />
    </div>
  );
}
