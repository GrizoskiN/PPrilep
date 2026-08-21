/**
 * GROQ queries for the Позитива blog.
 *
 * GROQ is Sanity's query language. Each constant here is a query string
 * that gets passed to `sanityClient.fetch(...)`.
 */

import { sanityClient } from "./client";

// ── Types matching the schema ────────────────────────────────────────────────

export type PostListItem = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: string;
  coverImage: {
    asset: { _ref: string };
    alt: string | null;
  } | null;
  author: { name: string; slug: string } | null;
  tags: { title: string; slug: string }[];
  categories: string[];
};

export type PostFull = PostListItem & {
  // PortableText blocks — opaque on the type level, rendered with PortableText
  body: unknown[] | null;
  videoUrl: string | null;
  /** Extra photos shown as a gallery under the content; empty when none added. */
  gallery: {
    asset: { _ref: string };
    alt: string | null;
    caption: string | null;
  }[];
};

// ── Queries ──────────────────────────────────────────────────────────────────

const POST_LIST_QUERY = `
  *[_type == "post" && defined(publishedAt) && publishedAt <= now()]
  | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    coverImage{asset, alt},
    "author": author->{name, "slug": slug.current},
    "tags": coalesce(tags[]->{title, "slug": slug.current}, []),
    "categories": coalesce(categories, [])
  }
`;

const POST_BY_SLUG_QUERY = `
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    coverImage{asset, alt},
    "author": author->{name, "slug": slug.current},
    "tags": coalesce(tags[]->{title, "slug": slug.current}, []),
    "categories": coalesce(categories, []),
    body,
    videoUrl,
    "gallery": coalesce(gallery[]{ asset, alt, caption }, [])
  }
`;

// ── City Event types ─────────────────────────────────────────────────────────

export type SanityEvent = {
  _id: string;
  title: string;
  category: string;
  startDate: string;         // "YYYY-MM-DD"
  endDate: string | null;
  time: string | null;
  location: string;
  description: string | null;
  coverImage: {
    asset: { _ref: string };
    alt: string | null;
  } | null;
  /** Extra photos shown under the cover; empty when the editor added none. */
  gallery: { asset: { _ref: string }; alt: string | null }[];
  sourceUrl: string | null;
  pinned: boolean;
  slug: string | null;
  autoPost: boolean;
  /** Optional single-choice poll; null when the editor added none. */
  poll: EventPoll | null;
};

/** An editor-authored poll on an event. Options carry their Sanity `_key`. */
export type EventPoll = {
  question: string;
  options: {
    key: string;
    label: string;
    /** Optional per-option image; editors add it in Studio, null when absent. */
    image: { asset: { _ref: string } } | null;
  }[];
};

const EVENT_FIELDS = `
    _id,
    title,
    category,
    startDate,
    endDate,
    time,
    location,
    description,
    coverImage{ asset, alt },
    "gallery": coalesce(gallery[]{ asset, alt }, []),
    sourceUrl,
    "pinned": coalesce(pinned, false),
    "slug": slug.current,
    "autoPost": coalesce(autoPost, false),
    "poll": select(
      defined(poll.question) && count(poll.options) >= 2 => {
        "question": poll.question,
        "options": poll.options[]{ "key": _key, label, "image": coalesce(image, null) }
      },
      null
    )
`;

const EVENTS_QUERY = `
  *[_type == "cityEvent"] | order(startDate asc) {
    ${EVENT_FIELDS}
  }
`;

// Spotlight for the right column: the pinned event if any, otherwise the next
// upcoming one. `order(pinned desc, ...)` floats a pinned event to the top;
// among ties the soonest wins. Only future/ongoing events qualify so a stale
// pin never shows. $today is compared against endDate (falls back to startDate).
const SPOTLIGHT_EVENT_QUERY = `
  *[_type == "cityEvent" && coalesce(endDate, startDate) >= $today]
  | order(coalesce(pinned, false) desc, startDate asc)[0] {
    ${EVENT_FIELDS}
  }
`;

// ── Fetchers ─────────────────────────────────────────────────────────────────

// Fallback ISR interval — webhook at /api/revalidate handles instant updates.
// 86 400 s = 24 h, so pages stay fresh even if the webhook misfires.
const REVALIDATE_CONTENT = 86_400;

export async function fetchPositivePosts(): Promise<PostListItem[]> {
  return sanityClient.fetch<PostListItem[]>(
    POST_LIST_QUERY,
    {},
    { next: { revalidate: REVALIDATE_CONTENT, tags: ["positive"] } },
  );
}

export async function fetchPositivePost(slug: string): Promise<PostFull | null> {
  return sanityClient.fetch<PostFull | null>(
    POST_BY_SLUG_QUERY,
    { slug },
    { next: { revalidate: REVALIDATE_CONTENT, tags: ["positive"] } },
  );
}

export async function fetchCityEvents(): Promise<SanityEvent[]> {
  return sanityClient.fetch<SanityEvent[]>(
    EVENTS_QUERY,
    {},
    { next: { revalidate: REVALIDATE_CONTENT, tags: ["events"] } },
  );
}

// One event for its shareable detail page, resolved by slug OR document id so
// events created before the slug field still open by _id.
const EVENT_BY_KEY_QUERY = `
  *[_type == "cityEvent" && (slug.current == $key || _id == $key)][0] {
    ${EVENT_FIELDS}
  }
`;

// The single event to feature in the right-column spotlight (pinned else next).
// `today` is a YYYY-MM-DD string so the compare matches the date-only fields.
export async function fetchSpotlightEvent(): Promise<SanityEvent | null> {
  const today = new Date().toISOString().slice(0, 10);
  return sanityClient.fetch<SanityEvent | null>(
    SPOTLIGHT_EVENT_QUERY,
    { today },
    { next: { revalidate: REVALIDATE_CONTENT, tags: ["events"] } },
  );
}

// Shareable per-event page, resolved by slug or _id (see EVENT_BY_KEY_QUERY).
export async function fetchEventByKey(key: string): Promise<SanityEvent | null> {
  return sanityClient.fetch<SanityEvent | null>(
    EVENT_BY_KEY_QUERY,
    { key },
    { next: { revalidate: REVALIDATE_CONTENT, tags: ["events"] } },
  );
}

// Uncached fetch by document id — used by the social-publish webhook, which
// fires the instant an event is published and must NOT read a stale cache.
export async function fetchEventFresh(id: string): Promise<SanityEvent | null> {
  return sanityClient.fetch<SanityEvent | null>(
    `*[_type == "cityEvent" && _id == $id][0] { ${EVENT_FIELDS} }`,
    { id },
    { cache: "no-store" },
  );
}

// ── Project types ─────────────────────────────────────────────────────────────

export type SanityProject = {
  _id: string;
  title: string;
  slug: string;
  status: "ongoing" | "completed" | "planned";
  category: string;
  excerpt: string | null;
  coverImage: { asset: { _ref: string }; alt: string | null } | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  volunteersCount: number | null;
  featured: boolean;
  publishedAt: string;
};

type SanityImg = { asset: { _ref: string } };

export type SanityProjectFull = SanityProject & {
  body: unknown[] | null;
  gallery: { asset: { _ref: string }; alt: string | null; caption: string | null }[] | null;
  beforeAfter:
    | { before: SanityImg; after: SanityImg; label: string | null }[]
    | null;
};

const PROJECTS_QUERY = `
  *[_type == "project"]
  | order(featured desc, publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    status,
    category,
    excerpt,
    coverImage{ asset, alt },
    location,
    startDate,
    endDate,
    volunteersCount,
    featured,
    publishedAt
  }
`;

const PROJECT_BY_SLUG_QUERY = `
  *[_type == "project" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    status,
    category,
    excerpt,
    coverImage{ asset, alt },
    location,
    startDate,
    endDate,
    volunteersCount,
    featured,
    publishedAt,
    body,
    gallery[]{ asset, alt, caption },
    beforeAfter[]{ before, after, label }
  }
`;

export async function fetchProjects(): Promise<SanityProject[]> {
  return sanityClient.fetch<SanityProject[]>(
    PROJECTS_QUERY,
    {},
    { next: { revalidate: REVALIDATE_CONTENT, tags: ["projects"] } },
  );
}

export async function fetchProject(slug: string): Promise<SanityProjectFull | null> {
  return sanityClient.fetch<SanityProjectFull | null>(
    PROJECT_BY_SLUG_QUERY,
    { slug },
    { next: { revalidate: REVALIDATE_CONTENT, tags: ["projects"] } },
  );
}
