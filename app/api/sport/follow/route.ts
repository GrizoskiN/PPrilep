/**
 * /api/sport/follow — "Следи не" on a club profile.
 *
 *   GET    ?slug=<club>  → { authed, following }   (following is false for guests)
 *   POST   ?slug=<club>  → follow   (201/200)      auth required
 *   DELETE ?slug=<club>  → unfollow                auth required
 *
 * Serves cookies (web) and Bearer tokens (mobile) through getRequestUser, the
 * same as /api/sport/mine. Writes go through the service-role admin client and
 * are scoped to the caller's own user id in code; RLS on club_followers is the
 * second line of defence for any direct client access.
 *
 * A follow is only accepted for a real, published club — fetchSportClub gates it
 * — so the table never accumulates rows for slugs that were never valid.
 */

import { NextResponse } from "next/server";
import { getRequestUser } from "../../../../lib/supabase/request-user";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { fetchSportClub } from "../../../../lib/sanity/sport";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function slugOf(req: Request): string {
  return (new URL(req.url).searchParams.get("slug") ?? "").trim();
}

/** Public follower count for a club. Identities stay private (RLS); only the
 *  total is exposed, via the service role. */
async function followerCount(admin: ReturnType<typeof createAdminClient>, slug: string): Promise<number> {
  if (!slug) return 0;
  const { count } = await admin
    .from("club_followers")
    .select("user_id", { count: "exact", head: true })
    .eq("club_slug", slug);
  return count ?? 0;
}

export async function GET(req: Request) {
  const slug = slugOf(req);
  const admin = createAdminClient();
  const followers = await followerCount(admin, slug);

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ authed: false, following: false, followers });
  if (!slug) return NextResponse.json({ authed: true, following: false, followers });

  const { data } = await admin
    .from("club_followers")
    .select("club_slug")
    .eq("user_id", user.id)
    .eq("club_slug", slug)
    .maybeSingle();

  return NextResponse.json({ authed: true, following: Boolean(data), followers });
}

export async function POST(req: Request) {
  const slug = slugOf(req);
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Најавете се." }, { status: 401 });

  // Only follow a club that actually exists and is published.
  const club = await fetchSportClub(slug).catch(() => null);
  if (!club) return NextResponse.json({ error: "Клубот не постои." }, { status: 404 });

  const admin = createAdminClient();
  // Upsert so a double-tap or a retry is a no-op rather than a unique violation.
  const { error } = await admin
    .from("club_followers")
    .upsert({ user_id: user.id, club_slug: slug }, { onConflict: "user_id,club_slug" });
  if (error) {
    console.error("[sport/follow] insert", error);
    return NextResponse.json({ error: "Не успеа следењето." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, following: true, followers: await followerCount(admin, slug) });
}

export async function DELETE(req: Request) {
  const slug = slugOf(req);
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Најавете се." }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("club_followers")
    .delete()
    .eq("user_id", user.id)
    .eq("club_slug", slug);
  if (error) {
    console.error("[sport/follow] delete", error);
    return NextResponse.json({ error: "Не успеа." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, following: false, followers: await followerCount(admin, slug) });
}
