/**
 * Sanity read client for the Next.js app.
 *
 * Uses the public anon-read endpoint (no token). With `useCdn: true` the
 * responses come from Sanity's CDN — cheap and fast. Stale-while-revalidate
 * via Next's default Data Cache.
 */

import { createClient } from "next-sanity";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-10-01",
  useCdn: true,
});
