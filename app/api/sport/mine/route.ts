/**
 * GET /api/sport/mine
 *
 * "Do I manage a club, and which one?" — the single call both the website and
 * the mobile app make before deciding whether to show the Уреди / Нова новост
 * affordances. Returns null for everyone else, which is most people.
 *
 * Serves cookies (web) and Bearer tokens (mobile) through getRequestUser.
 */

import { NextResponse } from "next/server";
import { getRequestUser } from "../../../../lib/supabase/request-user";
import { getClubAccess } from "../../../../lib/sport/owner";
import { fetchSportClub } from "../../../../lib/sanity/sport";

export async function GET(req: Request) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ club: null, isAdmin: false });

  const { clubSlug, isAdmin } = await getClubAccess(user.id);
  if (!clubSlug) return NextResponse.json({ club: null, isAdmin });

  // The name comes along so the caller can label the button without a second
  // round trip. A slug bound to a club that was since unpublished resolves to
  // null and the caller correctly shows nothing.
  const club = await fetchSportClub(clubSlug).catch(() => null);
  return NextResponse.json({
    club: club ? { slug: clubSlug, name: club.name } : null,
    isAdmin,
  });
}
