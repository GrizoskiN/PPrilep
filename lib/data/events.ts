// Static city-event data for the Случувања page.
// Structured so it can later be swapped for a Supabase table without touching
// the UI: keep the CityEvent shape and the helper exports stable.

export type EventCategory =
  | "concert"
  | "festival"
  | "sport"
  | "exhibition"
  | "theatre"
  | "cinema"
  | "family"
  | "other";

export interface CityEvent {
  id: string;
  title: string;
  category: EventCategory;
  /** ISO date (YYYY-MM-DD) of the start. */
  startDate: string;
  /** Optional ISO end date for multi-day events. */
  endDate?: string;
  /** Optional human time, e.g. "21:00". */
  time?: string;
  location: string;
  description?: string;
  /** Optional cover image URL; falls back to a category gradient. */
  imageUrl?: string;
  /** Optional external link (e.g. Facebook event). */
  sourceUrl?: string;
}

// Canonical in-app path for an event's shareable page. Prefers the slug,
// falls back to the Sanity document id for events created before slugs existed.
export function eventPath(ev: { slug?: string | null; _id: string }): string {
  return `/events/${ev.slug || ev._id}`;
}

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  concert: "Концерт",
  festival: "Фестивал",
  sport: "Спорт",
  exhibition: "Изложба",
  theatre: "Театар",
  cinema: "Кино",
  family: "Семејно",
  other: "Друго",
};

// Emoji + gradient used when an event has no cover image.
export const EVENT_CATEGORY_VISUAL: Record<
  EventCategory,
  { emoji: string; gradient: string }
> = {
  concert: { emoji: "🎵", gradient: "from-violet-500 to-fuchsia-500" },
  festival: { emoji: "🎪", gradient: "from-amber-500 to-rose-500" },
  sport: { emoji: "🏃", gradient: "from-emerald-500 to-teal-500" },
  exhibition: { emoji: "🖼️", gradient: "from-sky-500 to-indigo-500" },
  theatre: { emoji: "🎭", gradient: "from-rose-500 to-pink-600" },
  cinema: { emoji: "🎬", gradient: "from-indigo-500 to-violet-600" },
  family: { emoji: "🎈", gradient: "from-orange-400 to-amber-500" },
  other: { emoji: "📌", gradient: "from-slate-500 to-zinc-600" },
};

// CityEvent type kept for local/static use and type-checking, but the live
// data is now managed in Sanity and fetched via lib/sanity/queries.ts.
export interface CityEvent {
  id: string;
  title: string;
  category: EventCategory;
  startDate: string;
  endDate?: string;
  time?: string;
  location: string;
  description?: string;
  imageUrl?: string;
  sourceUrl?: string;
}
