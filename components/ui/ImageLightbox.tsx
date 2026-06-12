"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight, GitCompare, X } from "lucide-react";
import { cdnUrl } from "../../lib/utils";
import BeforeAfterSlider from "./BeforeAfterSlider";

interface Props {
  src: string;
  alt?: string;
  beforeSrc?: string | null;
  afterSrc?: string | null;
  onClose: () => void;
}

type Mode = "single" | "slider";

/**
 * Fullscreen image viewer. Image content is constrained to a max 1200px
 * wide / 88vh tall box and stays centered. The Пред / Потоа / Слајдер
 * controls are anchored to that box (not the viewport), so they sit on
 * the image edges and follow the image when smaller than 1200px.
 */
export default function ImageLightbox({
  src,
  alt = "",
  beforeSrc,
  afterSrc,
  onClose,
}: Props) {
  const [active, setActive] = useState<string>(src);
  const [mode, setMode] = useState<Mode>(
    beforeSrc && afterSrc ? "slider" : "single",
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const hasToggle = Boolean(beforeSrc && afterSrc);

  const isBeforeActive = mode === "single" && active === beforeSrc;
  const isAfterActive = mode === "single" && active === afterSrc;
  const isSliderActive = mode === "slider";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-1000 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out">
      {/* Image / slider container — capped at 1200px and used as the
          positioning origin for the side controls. Clicks on the empty space
          around the image fall through to the backdrop and close the viewer;
          interactive controls below stop propagation themselves. */}
      <div className="relative w-full max-w-300 flex items-center justify-center">
        {/* Close (top-right inside container) */}
        <button
          onClick={onClose}
          aria-label="Затвори"
          className="absolute top-3 right-3 z-20 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors">
          <X size={18} />
        </button>

        {hasToggle && (
          <>
            {/* Пред — middle-left of image */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMode("single");
                setActive(beforeSrc!);
              }}
              aria-label="Пред"
              className={`absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                isBeforeActive
                  ? "bg-white text-black"
                  : "bg-black/60 text-white hover:bg-black/80"
              }`}>
              <ChevronLeft size={14} />
              Пред
            </button>

            {/* Потоа — middle-right of image */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMode("single");
                setActive(afterSrc!);
              }}
              aria-label="Потоа"
              className={`absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                isAfterActive
                  ? "bg-teal-500 text-white"
                  : "bg-black/60 text-white hover:bg-black/80"
              }`}>
              Потоа
              <ChevronRight size={14} />
            </button>

            {/* Слајдер — bottom-center of image */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMode("slider");
              }}
              aria-label="Слајдер"
              className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                isSliderActive
                  ? "bg-white text-black"
                  : "bg-black/60 text-white hover:bg-black/80"
              }`}>
              <GitCompare size={13} />
              Слајдер
            </button>
          </>
        )}

        {hasToggle && mode === "slider" ? (
          // Wrap the slider so dragging the handle never bubbles to the backdrop.
          // w-full is required: the slider is `w-full`, so without an explicit
          // width on this flex child it collapses to zero (its images are
          // absolutely positioned) and the drag surface vanishes — which is why
          // the slider appeared "broken" in the lightbox / on mobile.
          <div
            className="w-full"
            onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <BeforeAfterSlider
              beforeSrc={beforeSrc!}
              afterSrc={afterSrc!}
              alt={alt}
            />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cdnUrl(active)}
            alt={alt}
            className="max-h-[88vh] max-w-full rounded-lg object-contain shadow-2xl cursor-zoom-out"
          />
        )}
      </div>
    </div>
  );
}
