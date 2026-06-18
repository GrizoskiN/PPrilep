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
    videoUrl
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
  sourceUrl: string | null;
};

const EVENTS_QUERY = `
  *[_type == "cityEvent"] | order(startDate asc) {
    _id,
    title,
    category,
    startDate,
    endDate,
    time,
    location,
    description,
    coverImage{ asset, alt },
    sourceUrl
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
