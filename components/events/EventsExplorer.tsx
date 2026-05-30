"use client";

import { useEffect, useMemo, useState } from "react";
import { Star, CalendarDays, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "../../lib/utils";
import ShareSheet from "../ui/ShareSheet";
import EventDetailModal from "./EventDetailModal";
import {
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_VISUAL,
  type EventCategory,
} from "../../lib/data/events";
import { urlForImage } from "../../lib/sanity/image";
import type { SanityEvent } from "../../lib/sanity/queries";

type DateFilter = "upcoming" | "week" | "month" | "all";

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "upcoming", label: "Идни" },
  { value: "week", label: "Оваа недела" },
  { value: "month", label: "Овој месец" },
  { value: "all", label: "Сите датуми" },
];

const CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[];
const STORAGE_KEY = "events_interested";

// ── Date helpers ─────────────────────────────────────────────────────────────

const MK_MONTHS = [
  "јан", "фев", "мар", "апр", "мај", "јун",
  "јул", "авг", "сеп", "окт", "ное", "дек",
];
const MK_WEEKDAYS = ["нед", "пон", "вто", "сре", "чет", "пет", "саб"];

/**
 * Format a YYYY-MM-DD string without Intl so the output is identical on the
 * server (Node.js) and on the client — avoids the locale hydration mismatch.
 * Parses the date as a local date (no timezone shift).
 */
function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${MK_WEEKDAYS[date.getDay()]}, ${d} ${MK_MONTHS[m - 1]}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatWhen(ev: SanityEvent): string {
  const startStr = fmtDate(ev.startDate);
  if (ev.endDate && ev.endDate !== ev.startDate) {
    return `${startStr} – ${fmtDate(ev.endDate)}`;
  }
  return ev.time ? `${startStr} · ${ev.time}` : startStr;
}

// ── Cover (Sanity image or category gradient fallback) ────────────────────────
function EventCover({ ev }: { ev: SanityEvent }) {
  const visual =
    EVENT_CATEGORY_VISUAL[ev.category as EventCategory] ??
    EVENT_CATEGORY_VISUAL.other;

  if (ev.coverImage?.asset) {
    const src = urlForImage(ev.coverImage).width(800).height(480).url();
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
        "flex h-full w-full items-center justify-center bg-gradient-to-br",
        visual.gradient,
      )}>
      <span className="text-5xl drop-shadow-sm">{visual.emoji}</span>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const label =
    EVENT_CATEGORY_LABELS[category as EventCategory] ?? category;
  return (
    <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  events: SanityEvent[];
}

export default function EventsExplorer({ events }: Props) {
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("upcoming");
  const [interested, setInterested] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<SanityEvent | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setInterested(new Set(JSON.parse(raw) as string[]));
      } catch { /* ignore */ }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function toggleInterested(id: string) {
    setInterested((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  }

  function eventUrl(ev: SanityEvent): string {
    if (ev.sourceUrl) return ev.sourceUrl;
    if (typeof window !== "undefined") return `${window.location.origin}/events`;
    return "/events";
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const today = startOfDay(new Date());
    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 7);

    return events.filter((ev) => {
      if (category !== "all" && ev.category !== category) return false;

      const start = startOfDay(new Date(ev.startDate));
      const end = startOfDay(new Date(ev.endDate ?? ev.startDate));

      if (dateFilter === "upcoming") return end >= today;
      if (dateFilter === "week") return end >= today && start <= weekAhead;
      if (dateFilter === "month")
        return (
          end >= today &&
          start.getFullYear() === today.getFullYear() &&
          start.getMonth() === today.getMonth()
        );
      return true;
    });
    // already sorted by startDate asc from GROQ
  }, [events, category, dateFilter]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
        <p className="text-2xl">📅</p>
        <p className="mt-2 text-sm font-medium text-zinc-700">
          Сè уште нема внесени настани
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Додајте настани преку{" "}
          <Link href="/studio" className="text-rose-500 hover:underline">
            Studio
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-5">
      {/* ── Filters ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setDateFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                dateFilter === f.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
              )}>
              <CalendarDays size={13} />
              {f.label}
            </button>
          ))}
        </div>

        <div className="scrollbar-hidden -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <CategoryChip
            label="Сите"
            active={category === "all"}
            onClick={() => setCategory("all")}
          />
          {CATEGORIES.map((c) => (
            <CategoryChip
              key={c}
              label={EVENT_CATEGORY_LABELS[c]}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-theme-muted">
            Нема настани за избраните филтри.
          </p>
        </div>
      )}

      {/* ── Featured ── */}
      {featured && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-theme-heading">
            Следен настан
          </h2>
          <div
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm sm:flex cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => setSelectedEvent(featured)}>
            <div className="relative h-52 w-full shrink-0 sm:h-auto sm:w-2/5 lg:w-1/3">
              <EventCover ev={featured} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
              <div className="space-y-1.5">
                <CategoryBadge category={featured.category} />
                <h3 className="text-lg font-bold leading-snug text-theme-heading">
                  {featured.title}
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-theme-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={14} /> {formatWhen(featured)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} /> {featured.location}
                  </span>
                </div>
                {featured.description && (
                  <p className="pt-1 text-sm leading-relaxed text-theme-muted line-clamp-5">
                    {featured.description}
                  </p>
                )}
              </div>
              <div className="mt-auto flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                <InterestedButton
                  active={interested.has(featured._id)}
                  onClick={() => toggleInterested(featured._id)}
                  large
                />
                <ShareSheet
                  url={eventUrl(featured)}
                  title={featured.title}
                  showLabel
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-200"
                />
                {featured.sourceUrl && (
                  <a
                    href={featured.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-rose-500 hover:underline">
                    Повеќе →
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Grid ── */}
      {rest.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-theme-heading">
            Откриј настани
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((ev) => (
              <article
                key={ev._id}
                onClick={() => setSelectedEvent(ev)}
                className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md cursor-pointer">
                <div className="relative h-44 w-full">
                  <EventCover ev={ev} />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3.5">
                  <CategoryBadge category={ev.category} />
                  <h3 className="text-sm font-bold leading-snug text-theme-heading">
                    {ev.title}
                  </h3>
                  <div className="space-y-1 text-xs text-theme-muted">
                    <p className="inline-flex items-center gap-1.5">
                      <Clock size={12} /> {formatWhen(ev)}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <MapPin size={12} /> {ev.location}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <InterestedButton
                      active={interested.has(ev._id)}
                      onClick={() => toggleInterested(ev._id)}
                    />
                    <ShareSheet
                      url={eventUrl(ev)}
                      title={ev.title}
                      className="inline-flex h-8 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    />
                    {ev.sourceUrl && (
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-[11px] text-rose-500 hover:underline">
                        Повеќе →
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>

    {/* ── Event Detail Modal ── */}
    {selectedEvent && (
      <EventDetailModal
        event={selectedEvent}
        interested={interested.has(selectedEvent._id)}
        onToggleInterested={(id) => {
          toggleInterested(id);
        }}
        onClose={() => setSelectedEvent(null)}
        shareUrl={eventUrl(selectedEvent)}
      />
    )}
    </>
  );
}

function CategoryChip({
  label, active, onClick,
}: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-rose-300 bg-rose-50 text-rose-700"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
      )}>
      {label}
    </button>
  );
}

function InterestedButton({
  active, onClick, large = false,
}: {
  active: boolean; onClick: () => void; large?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors",
        large ? "px-4 py-2 text-sm" : "h-8 px-3 text-xs",
        active
          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
      )}>
      <Star size={large ? 15 : 14} className={active ? "fill-amber-500" : ""} />
      Заинтересиран
    </button>
  );
}
