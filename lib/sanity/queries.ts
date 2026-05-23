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
};

export type PostFull = PostListItem & {
  // PortableText blocks — opaque on the type level, rendered with PortableText
  body: unknown[] | null;
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
    "tags": tags[]->{title, "slug": slug.current}
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
    "tags": tags[]->{title, "slug": slug.current},
    body
  }
`;

// ── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchPositivePosts(): Promise<PostListItem[]> {
  return sanityClient.fetch<PostListItem[]>(
    POST_LIST_QUERY,
    {},
    { next: { revalidate: 60 } }, // ISR: refresh at most every 60s
  );
}

export async function fetchPositivePost(slug: string): Promise<PostFull | null> {
  return sanityClient.fetch<PostFull | null>(
    POST_BY_SLUG_QUERY,
    { slug },
    { next: { revalidate: 60 } },
  );
}
