/**
 * GET /api/sport/news/list?slug=…
 *
 * The club's own announcements, for the manage screen. Reads through the same
 * public query the site uses, so a club is never shown a version of its news
 * that visitors cannot see.
 */

import { NextResponse } from "next/server";
import { fetchClubNews } from "../../../../../lib/sanity/sport";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug) return NextResponse.json({ items: [] });
  const items = await fetchClubNews(slug, 30).catch(() => []);
  return NextResponse.json({ items });
}
