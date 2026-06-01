"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CalendarDays, MapPin, Clock, ExternalLink } from "lucide-react";
import { cn } from "../../lib/utils";
import ShareSheet from "../ui/ShareSheet";
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

function EventCover({ ev }: { ev: SanityEvent }) {
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
        className="h-full w-full object-cover"
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
  onToggleInterested: (id: string) => void;
  onClose: () => void;
  shareUrl: string;
}

// ── Modal ────────────────────────────────────────────────────────────────────

export default function EventDetailModal({
  event: ev,
  interested,
  onToggleInterested,
  onClose,
  shareUrl,
}: Props) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          <EventCover ev={ev} />

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
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              interested
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
            )}>
            <Star
              size={15}
              className={interested ? "fill-amber-500" : ""}
            />
            {interested ? "Заинтересиран ✓" : "Заинтересиран"}
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
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}
