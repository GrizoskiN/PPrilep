/**
 * GROQ queries, types and label tables for Спорт и Рекреација.
 *
 * Shared by the web pages, the submission API route and (via the same field
 * names) the mobile screens — the label tables live here so a club typed as
 * "gym" reads "Фитнес центар" everywhere, and a value renamed in the schema
 * breaks in exactly one place.
 *
 * Unpublished submissions are invisible to this client: it holds no token, and
 * every query filters `isSubmission != true || reviewed == true` anyway, so a
 * draft can never leak onto the site even if one is published by accident.
 */

import { sanityClient } from "./client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SanityImageRef = { asset: { _ref: string } } | null;

export type TrainingSlot = {
  group: string;
  /** JS getDay() values as strings — "1" = Monday, "0" = Sunday. */
  days: string[];
  startTime: string;
  endTime: string | null;
  venue: string | null;
};

export type PriceItem = {
  label: string;
  price: number;
  period: "month" | "year" | "session" | "once";
  note: string | null;
};

export type Coach = {
  name: string;
  role: string | null;
  photo: SanityImageRef;
};

export type SportClub = {
  _id: string;
  name: string;
  slug: string;
  kind: string;
  sports: string[];
  logo: SanityImageRef;
  coverImage: SanityImageRef;
  foundedYear: number | null;
  shortDescription: string | null;
  about: string | null;
  ageGroups: string[];
  gender: string | null;
  level: string[];
  schedule: TrainingSlot[];
  pricing: PriceItem[];
  freeTrial: boolean;
  acceptingMembers: boolean;
  howToJoin: string | null;
  venue: string | null;
  address: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  coaches: Coach[];
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  updatedAt: string | null;
  verified: boolean;
};

/** The listing needs a fraction of the fields; the card renders from these. */
export type SportClubCard = Pick<
  SportClub,
  | "_id" | "name" | "slug" | "kind" | "sports" | "logo" | "shortDescription"
  | "ageGroups" | "district" | "acceptingMembers" | "freeTrial" | "verified"
>;

// ── Labels ────────────────────────────────────────────────────────────────────

export const KIND_LABEL: Record<string, string> = {
  club: "Спортски клуб",
  federation: "Сојуз",
  gym: "Фитнес центар",
  centre: "Спортски центар",
  school: "Школа",
  recreation: "Рекреативна група",
};

export const AGE_LABEL: Record<string, string> = {
  "4-6": "Предучилишна (4–6)",
  "7-11": "Деца (7–11)",
  "12-15": "Кадети (12–15)",
  "16-18": "Јуниори (16–18)",
  "18+": "Сениори (18+)",
  recreation: "Рекреативци",
  veterans: "Ветерани",
};

export const GENDER_LABEL: Record<string, string> = {
  mixed: "Мешано",
  male: "Машки",
  female: "Женски",
};

export const LEVEL_LABEL: Record<string, string> = {
  beginner: "Почетници",
  advanced: "Напредни",
  competitive: "Натпреварувачки",
  recreational: "Рекреативно",
};

export const PERIOD_LABEL: Record<string, string> = {
  month: "месечно",
  year: "годишно",
  session: "по термин",
  once: "еднократно",
};

/** Indexed by JS getDay(), so Sunday first — same convention as busStation.ts. */
export const DAY_SHORT = ["Нед", "Пон", "Вто", "Сре", "Чет", "Пет", "Саб"];

/**
 * "Пон, Сре, Пет" — always in week order regardless of the order they were
 * ticked, and with Sunday last rather than first, because a reader scanning a
 * training schedule reads the week the way it is lived, not the way `getDay()`
 * numbers it.
 */
export function formatDays(days: string[]): string {
  const weekOrder = (d: string) => (d === "0" ? 7 : Number(d));
  return [...days]
    .sort((a, b) => weekOrder(a) - weekOrder(b))
    .map((d) => DAY_SHORT[Number(d)] ?? d)
    .join(", ");
}

/** "18:00 – 19:30", or just "18:00" when the club left the end time blank. */
export function formatSlotTime(slot: TrainingSlot): string {
  return slot.endTime ? `${slot.startTime} – ${slot.endTime}` : slot.startTime;
}

// ── GROQ ──────────────────────────────────────────────────────────────────────

/**
 * A submission that has not been reviewed never renders, even if it somehow
 * got published — the review flag is the gate, not the publish button alone.
 */
const PUBLIC = `_type == "sportClub" && (isSubmission != true || reviewed == true)`;

const CARD_FIELDS = `
  _id, name, "slug": slug.current, kind, sports, logo{ asset },
  shortDescription, ageGroups, district, verified,
  "acceptingMembers": coalesce(acceptingMembers, true),
  "freeTrial": coalesce(freeTrial, false)
`;

const FULL_FIELDS = `
  ${CARD_FIELDS},
  coverImage{ asset }, foundedYear, about, gender, level,
  schedule[]{ group, days, startTime, endTime, venue },
  pricing[]{ label, price, period, note },
  coaches[]{ name, role, photo{ asset } },
  howToJoin, venue, address, lat, lng,
  phone, email, website, facebook, instagram, tiktok, youtube,
  updatedAt
`;

/**
 * Clubs still taking members come first: a profile you can act on today is
 * worth more than one you cannot, and alphabetical order inside each half
 * keeps the list predictable.
 */
const CLUBS_QUERY = `
  *[${PUBLIC}] | order(coalesce(acceptingMembers, true) desc, name asc) {
    ${CARD_FIELDS}
  }
`;

const CLUB_BY_SLUG_QUERY = `
  *[${PUBLIC} && slug.current == $slug][0] { ${FULL_FIELDS} }
`;

const CLUB_SLUGS_QUERY = `*[${PUBLIC}].slug.current`;

// ── Fetchers ──────────────────────────────────────────────────────────────────

export async function fetchSportClubs(): Promise<SportClubCard[]> {
  return (await sanityClient.fetch<SportClubCard[]>(CLUBS_QUERY)) ?? [];
}

export async function fetchSportClub(slug: string): Promise<SportClub | null> {
  if (!slug.trim()) return null;
  return await sanityClient.fetch<SportClub | null>(CLUB_BY_SLUG_QUERY, { slug });
}

export async function fetchSportClubSlugs(): Promise<string[]> {
  const slugs = await sanityClient.fetch<(string | null)[]>(CLUB_SLUGS_QUERY);
  return (slugs ?? []).filter((s): s is string => Boolean(s));
}

/**
 * Every sport named by at least one club, deduplicated and sorted — the filter
 * chips are built from the data rather than from a fixed list, so a club that
 * brings a sport nobody else offers is filterable the moment it is published.
 */
export function sportsIn(clubs: SportClubCard[]): string[] {
  const seen = new Set<string>();
  for (const club of clubs) {
    for (const sport of club.sports ?? []) seen.add(sport.trim().toLocaleLowerCase("mk"));
  }
  return [...seen].filter(Boolean).sort((a, b) => a.localeCompare(b, "mk"));
}

// ── Новости од клубовите ──────────────────────────────────────────────────────

export type SportNewsItem = {
  _id: string;
  title: string;
  body: string | null;
  image: SanityImageRef;
  link: string | null;
  publishedAt: string;
  pinned: boolean;
  club: { name: string; slug: string } | null;
};

/**
 * The same two gates as the clubs: unreviewed submissions stay invisible, and a
 * post whose club was later unpublished disappears with it (`club->` resolves
 * to null and the item is dropped by `defined(club)`).
 */
const NEWS_PUBLIC = `
  _type == "sportPost" && (isSubmission != true || reviewed == true)
  && defined(club) && publishedAt <= now()
`;

const NEWS_FIELDS = `
  _id, title, body, image{ asset }, link, publishedAt,
  "pinned": coalesce(pinned, false),
  "club": club->{ name, "slug": slug.current }
`;

const NEWS_QUERY = `
  *[${NEWS_PUBLIC}] | order(publishedAt desc) [0...$limit] { ${NEWS_FIELDS} }
`;

const CLUB_NEWS_QUERY = `
  *[${NEWS_PUBLIC} && club->slug.current == $slug]
    | order(coalesce(pinned, false) desc, publishedAt desc) [0...$limit] { ${NEWS_FIELDS} }
`;

/** The latest announcements across every club — the right panel's news block. */
export async function fetchSportNews(limit = 6): Promise<SportNewsItem[]> {
  return (await sanityClient.fetch<SportNewsItem[]>(NEWS_QUERY, { limit })) ?? [];
}

/** One club's announcements, pinned first — shown on its profile. */
export async function fetchClubNews(slug: string, limit = 8): Promise<SportNewsItem[]> {
  if (!slug.trim()) return [];
  return (
    (await sanityClient.fetch<SportNewsItem[]>(CLUB_NEWS_QUERY, { slug, limit })) ?? []
  );
}

// ── Денешниот распоред ────────────────────────────────────────────────────────

export type DaySlot = TrainingSlot & { club: string; clubSlug: string };

const SCHEDULE_QUERY = `
  *[${PUBLIC} && count(schedule) > 0] {
    name, "slug": slug.current,
    schedule[]{ group, days, startTime, endTime, venue }
  }
`;

/**
 * Every training happening on `day` (JS getDay(), 0 = Sunday), flattened across
 * all clubs and sorted by start time.
 *
 * The filtering happens here rather than in GROQ on purpose: "today" depends on
 * the reader's date in Europe/Skopje, and a query that bakes a weekday into the
 * string would be cached by the CDN with yesterday's answer.
 */
export async function fetchDaySchedule(day: number): Promise<DaySlot[]> {
  const clubs =
    (await sanityClient.fetch<
      { name: string; slug: string | null; schedule: TrainingSlot[] }[]
    >(SCHEDULE_QUERY)) ?? [];

  const slots: DaySlot[] = [];
  for (const club of clubs) {
    if (!club.slug) continue;
    for (const slot of club.schedule ?? []) {
      if (!(slot.days ?? []).includes(String(day))) continue;
      slots.push({ ...slot, club: club.name, clubSlug: club.slug });
    }
  }
  return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** The weekday in Prilep right now, as a JS getDay() value. */
export function todayInPrilep(): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Skopje",
    weekday: "short",
  }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}
