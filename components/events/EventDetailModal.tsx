"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CalendarDays, MapPin, Clock, ExternalLink, Maximize2 } from "lucide-react";
import { cn } from "../../lib/utils";
import ShareSheet from "../ui/ShareSheet";
import ImageLightbox from "../ui/ImageLightbox";
import {
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_VISUAL,
  type EventCategory,
} from "../../lib/data/events";
import { urlForImage } from "../../lib/sanity/image";
import type { SanityEvent } from "../../lib/sanity/queries";
import { Star } from "lucide-react";

// ── Date helpers (same as EventsExplorer, no Intl) ──────────────────────────

const MK_MONTHS_FULL = [
  "јануари", "февруари", "март", "април", "мај", "јуни",
  "јули", "август", "септември", "октомври", "ноември", "декември",
];
const MK_WEEKDAYS_FULL = [
  "недела", "понеделник", "вторник", "среда", "четврток", "петок", "сабота",
];

function fmtFull(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${MK_WEEKDAYS_FULL[date.getDay()]}, ${d} ${MK_MONTHS_FULL[m - 1]} ${y}`;
}

function formatWhenFull(ev: SanityEvent): string {
  const startStr = fmtFull(ev.startDate);
  if (ev.endDate && ev.endDate !== ev.startDate) {
    return `${startStr} – ${fmtFull(ev.endDate)}`;
  }
  return startStr;
}

// ── Cover image / gradient ───────────────────────────────────────────────────

function EventCover({ ev, onImageClick }: { ev: SanityEvent; onImageClick?: () => void }) {
  const visual =
    EVENT_CATEGORY_VISUAL[ev.category as EventCategory] ??
    EVENT_CATEGORY_VISUAL.other;

  if (ev.coverImage?.asset) {
    const src = urlForImage(ev.coverImage).width(1200).height(600).url();
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={ev.coverImage.alt ?? ev.title}
        onClick={onImageClick}
        className={cn("h-full w-full object-cover", onImageClick && "cursor-zoom-in")}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-linear-to-br",
        visual.gradient,
      )}>
      <span className="text-7xl drop-shadow-sm">{visual.emoji}</span>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  event: SanityEvent;
  interested: boolean;
  interestedCount?: number;
  onToggleInterested: (id: string) => void;
  onClose: () => void;
  shareUrl: string;
}

// ── Modal ────────────────────────────────────────────────────────────────────

export default function EventDetailModal({
  event: ev,
  interested,
  interestedCount = 0,
  onToggleInterested,
  onClose,
  shareUrl,
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Full-resolution, uncropped source for the fullscreen viewer.
  const coverFull =
    ev.coverImage && ev.coverImage.asset
      ? urlForImage(ev.coverImage).width(1600).url()
      : null;
  const hasCover = Boolean(coverFull);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Let the lightbox handle Escape while it's open (it closes itself).
      if (e.key === "Escape" && !lightboxOpen) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, lightboxOpen]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const visual =
    EVENT_CATEGORY_VISUAL[ev.category as EventCategory] ??
    EVENT_CATEGORY_VISUAL.other;
  const categoryLabel =
    EVENT_CATEGORY_LABELS[ev.category as EventCategory] ?? ev.category;

  const modal = (
    <>
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ev.title}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl max-h-[92dvh]">
        {/* Cover image */}
        <div className="relative h-52 w-full shrink-0 sm:h-64">
          <EventCover
            ev={ev}
            onImageClick={hasCover ? () => setLightboxOpen(true) : undefined}
          />

          {/* View full image */}
          {hasCover && (
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition hover:bg-black/65">
              <Maximize2 size={12} /> Цела слика
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60">
            <X size={18} />
          </button>

          {/* Category badge overlaid on image */}
          <div className="absolute bottom-3 left-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
                "bg-white/90 backdrop-blur-sm text-zinc-800",
              )}>
              <span>{visual.emoji}</span>
              {categoryLabel}
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <h2 className="text-xl font-bold leading-snug text-zinc-900">
            {ev.title}
          </h2>

          {/* Meta rows */}
          <ul className="space-y-2.5">
            <li className="flex items-start gap-3 text-sm text-zinc-600">
              <CalendarDays size={16} className="mt-0.5 shrink-0 text-zinc-400" />
              <span>{formatWhenFull(ev)}</span>
            </li>

            {ev.time && (
              <li className="flex items-start gap-3 text-sm text-zinc-600">
                <Clock size={16} className="mt-0.5 shrink-0 text-zinc-400" />
                <span>{ev.time} часот</span>
              </li>
            )}

            <li className="flex items-start gap-3 text-sm text-zinc-600">
              <MapPin size={16} className="mt-0.5 shrink-0 text-zinc-400" />
              <span>{ev.location}</span>
            </li>
          </ul>

          {/* Description */}
          {ev.description && (
            <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-line">
              {ev.description}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 border-t border-zinc-100 px-5 py-3.5 flex items-center gap-2">
          {/* Interested */}
          <button
            onClick={() => onToggleInterested(ev._id)}
            aria-pressed={interested}
            className={cn(
              "flex max-w-[15rem] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              interested
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-primary-light text-primary hover:bg-primary/15",
            )}>
            <Star size={15} className={interested ? "fill-white" : ""} />
            {interested ? "Заинтересиран ✓" : "Заинтересиран"}
            {interestedCount > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold tabular-nums text-primary shadow-sm">
                {interestedCount}
              </span>
            )}
          </button>

          {/* Share */}
          <ShareSheet
            url={shareUrl}
            title={ev.title}
            showLabel
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-200"
          />

          {/* External link */}
          {ev.sourceUrl && (
            <a
              href={ev.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors">
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Повеќе</span>
            </a>
          )}
        </div>
      </div>
    </div>

    {lightboxOpen && coverFull && (
      <ImageLightbox
        src={coverFull}
        alt={ev.coverImage?.alt ?? ev.title}
        onClose={() => setLightboxOpen(false)}
      />
    )}
    </>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}
