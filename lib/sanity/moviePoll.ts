/**
 * The Кино анкета document, read from Sanity.
 *
 * Poll creation lives only in the Studio — Supabase holds the suggested films
 * and the votes, keyed by this document's `_id`. Shared by the API route
 * (app/api/movie-poll) and the server components that show the poll, so the
 * GROQ and the limit clamping exist in exactly one place.
 */

import { sanityClient } from "./client";
import { urlForImage } from "./image";

export type PollRow = {
  id: string;
  title: string;
  description: string | null;
  /** Ready-to-use banner URL, or null when the poll has no image. */
  poster_url: string | null;
  /** When the film is shown. Purely informational — it gates nothing. */
  screening_at: string | null;
  is_open: boolean;
  allow_suggestions: boolean;
  /** Total films the list will hold. */
  max_suggestions: number;
  /** How many films one account may add. */
  max_per_user: number;
  starts_at: string | null;
  closes_at: string | null;
};

/** Shape of the Sanity document, before it is normalised into a PollRow. */
type SanityPoll = {
  _id: string;
  title: string;
  description?: string;
  poster?: { asset?: { _ref?: string } };
  screeningAt?: string;
  isOpen?: boolean;
  allowSuggestions?: boolean;
  maxSuggestions?: number;
  maxPerUser?: number;
  startsAt?: string;
  closesAt?: string;
};

const POLL_FIELDS = `_id, title, description, poster, screeningAt, isOpen, allowSuggestions,
  maxSuggestions, maxPerUser, startsAt, closesAt`;

/** Hard ceilings, so a mistyped Studio field cannot uncap the list. */
const MAX_OPTIONS_CEILING = 200;
const MAX_PER_USER_CEILING = 20;

function toPoll(doc: SanityPoll): PollRow {
  return {
    id: doc._id,
    title: doc.title,
    description: doc.description ?? null,
    // Resolved server-side so neither client needs the Sanity image builder.
    poster_url: doc.poster?.asset?._ref
      ? urlForImage(doc.poster).width(1200).height(630).fit("crop").url()
      : null,
    // Both flags default to ON when the field was never set — an older document
    // saved before these fields existed should still behave like a normal poll.
    screening_at: doc.screeningAt ?? null,
    is_open: doc.isOpen !== false,
    allow_suggestions: doc.allowSuggestions !== false,
    max_suggestions: Math.min(Math.max(doc.maxSuggestions ?? 30, 2), MAX_OPTIONS_CEILING),
    max_per_user: Math.min(Math.max(doc.maxPerUser ?? 2, 1), MAX_PER_USER_CEILING),
    starts_at: doc.startsAt ?? null,
    closes_at: doc.closesAt ?? null,
  };
}

/** A poll is live when it is flagged open and inside its window. */
export function isLive(poll: PollRow): boolean {
  const now = Date.now();
  if (!poll.is_open) return false;
  if (poll.starts_at && new Date(poll.starts_at).getTime() > now) return false;
  if (poll.closes_at && new Date(poll.closes_at).getTime() < now) return false;
  return true;
}

/**
 * One poll by id, or — with no id — the newest one that is currently live.
 * "Live" is evaluated in GROQ as well as in JS so a scheduled poll does not
 * become the current one before its start date.
 */
export async function loadPoll(pollId: string | null): Promise<PollRow | null> {
  try {
    if (pollId) {
      const doc = await sanityClient.fetch<SanityPoll | null>(
        `*[_type == "moviePoll" && _id == $id][0]{${POLL_FIELDS}}`,
        { id: pollId },
      );
      return doc ? toPoll(doc) : null;
    }
    const doc = await sanityClient.fetch<SanityPoll | null>(
      `*[_type == "moviePoll" && isOpen != false
         && (!defined(startsAt) || startsAt <= now())
         && (!defined(closesAt) || closesAt >= now())
       ] | order(_createdAt desc)[0]{${POLL_FIELDS}}`,
    );
    return doc ? toPoll(doc) : null;
  } catch {
    return null;
  }
}

// Macedonian month and weekday names, written out rather than left to Intl.
// `mk-MK` is not in every runtime's ICU data — on the server it silently fell
// back to English ("Thursday, August 27"), which is not a failure Intl reports.
// Only the timeZone shift is taken from Intl, and that works everywhere.
const MK_MONTHS = [
  "јануари", "февруари", "март", "април", "мај", "јуни",
  "јули", "август", "септември", "октомври", "ноември", "декември",
];
const MK_WEEKDAYS = [
  "недела", "понеделник", "вторник", "среда", "четврток", "петок", "сабота",
];

/** The date's parts as they read in Prilep, whatever the server's timezone. */
function skopjeParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Skopje",
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    get("weekday"),
  );
  return {
    weekday: MK_WEEKDAYS[weekdayIndex] ?? "",
    day: Number(get("day")),
    month: MK_MONTHS[Number(get("month")) - 1] ?? "",
    year: get("year"),
    // 24:00 is how en-GB renders midnight with hour12:false.
    hour: get("hour") === "24" ? "00" : get("hour"),
    minute: get("minute"),
  };
}

/** "четврток, 27 август во 21:30" */
export function formatScreening(iso: string): string {
  const p = skopjeParts(iso);
  return `${p.weekday}, ${p.day} ${p.month} во ${p.hour}:${p.minute}`;
}

/** "27 август 2026" — the date alone, for screenings already past. */
export function formatScreeningDate(iso: string): string {
  const p = skopjeParts(iso);
  return `${p.day} ${p.month} ${p.year}`;
}

/** A screening that already happened — the archive shown next to the poll. */
export type PastScreening = {
  id: string;
  title: string;
  screened_at: string;
  poster_url: string | null;
  note: string | null;
};

type SanityScreening = {
  _id: string;
  title: string;
  screenedAt: string;
  poster?: { asset?: { _ref?: string } };
  note?: string;
};

/**
 * The most recent screenings, newest first. Capped because this is a sidebar,
 * not an archive page — twelve is about two screenings a month for half a year.
 */
export async function fetchPastScreenings(limit = 12): Promise<PastScreening[]> {
  try {
    const docs = await sanityClient.fetch<SanityScreening[]>(
      `*[_type == "pastScreening" && defined(screenedAt)]
       | order(screenedAt desc)[0...$limit]{_id, title, screenedAt, poster, note}`,
      { limit },
    );
    return (docs ?? []).map((d) => ({
      id: d._id,
      title: d.title,
      screened_at: d.screenedAt,
      poster_url: d.poster?.asset?._ref
        ? urlForImage(d.poster).width(400).height(600).fit("crop").url()
        : null,
      note: d.note ?? null,
    }));
  } catch {
    return [];
  }
}
