/**
 * GET /api/giphy/search?q=<query>&limit=24&offset=0
 *
 * Server-side proxy for GIPHY so the API key (GIPHY_API_KEY) never ships in the
 * mobile bundle or the web client. Empty `q` returns trending. Results are
 * trimmed to just what the picker needs and CDN-cached so repeated searches for
 * the same term collapse into one upstream call.
 *
 * Setup: add GIPHY_API_KEY (a GIPHY app key) to the env.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "fra1";

const KEY = process.env.GIPHY_API_KEY;

const CACHE_HEADERS = {
  // GIF result sets are stable; let the edge serve one cached response per term.
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

type GiphyImage = { url?: string; width?: string; height?: string };
type GiphyItem = {
  id: string;
  images?: {
    fixed_width?: GiphyImage;
    fixed_width_small?: GiphyImage;
    downsized?: GiphyImage;
  };
};

export async function GET(req: Request) {
  const empty = NextResponse.json({ gifs: [] }, { headers: CACHE_HEADERS });
  if (!KEY) return empty;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 24, 1), 50);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  const endpoint = q
    ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(q)}&`
    : `https://api.giphy.com/v1/gifs/trending?`;
  const url =
    `${endpoint}api_key=${KEY}&limit=${limit}&offset=${offset}` +
    `&rating=pg-13&bundle=messaging_non_clips`;

  try {
    const res = await fetch(url);
    if (!res.ok) return empty;
    const json = (await res.json()) as { data?: GiphyItem[] };
    const gifs = (json.data ?? [])
      .map((g) => {
        const fw = g.images?.fixed_width;
        const src = fw?.url ?? g.images?.downsized?.url;
        return {
          id: g.id,
          url: src, // animated GIF to post + render inline
          preview: g.images?.fixed_width_small?.url ?? src,
          width: Number(fw?.width) || 200,
          height: Number(fw?.height) || 200,
        };
      })
      .filter((g) => Boolean(g.url));
    return NextResponse.json({ gifs }, { headers: CACHE_HEADERS });
  } catch {
    return empty;
  }
}
