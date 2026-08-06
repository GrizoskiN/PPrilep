/**
 * POST /api/social/publish
 *
 * Sanity webhook fired when a cityEvent is created/updated. Auto-posts the
 * event to our Facebook Page and Instagram exactly once (deduped via the
 * `social_posts` table). Safe to receive repeat webhooks — already-posted
 * events are skipped.
 *
 * Setup:
 *  1. Env vars (Vercel): SANITY_SOCIAL_SECRET, FB_PAGE_ID, IG_USER_ID,
 *     META_PAGE_ACCESS_TOKEN. Run supabase/add_social_posts.sql.
 *  2. Sanity → manage → API → Webhooks (a SECOND webhook, alongside revalidate):
 *       URL:     https://www.mojprilep.mk/api/social/publish?secret=<SANITY_SOCIAL_SECRET>
 *       Trigger: Create, Update
 *       Filter:  _type == "cityEvent"
 *       Projection: leave default (whole document) — we only read _id / _type.
 *       HTTP method: POST
 */

import { NextResponse } from "next/server";
import { fetchEventFresh } from "@/lib/sanity/queries";
import { instagramCarouselUrls, socialImageUrls } from "@/lib/social/image";
import { eventPath } from "@/lib/data/events";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildCaption,
  postCarouselToInstagram,
  postToFacebook,
  postToInstagram,
  facebookConfigured,
  instagramConfigured,
  type SocialPost,
} from "@/lib/social/meta";
import type { SanityEvent } from "@/lib/sanity/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.SANITY_SOCIAL_SECRET;
const BASE_URL = "https://mojprilep.mk";

// Facebook auto-posting stays OFF until `pages_manage_posts` gets Advanced
// Access via App Review — until then API-published Page posts are visible only
// to app-role users (admin-only), so we post FB by hand and let IG auto-post.
// Flip FB_AUTOPOST_ENABLED=true in Vercel once App Review is approved.
const FB_AUTOPOST = process.env.FB_AUTOPOST_ENABLED === "true";

// ── Macedonian date range (no Intl → deterministic) ──────────────────────────
const MK_MONTHS = [
  "јануари", "февруари", "март", "април", "мај", "јуни",
  "јули", "август", "септември", "октомври", "ноември", "декември",
];

function fmt(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MK_MONTHS[m - 1]} ${y}`;
}

function whenText(ev: SanityEvent): string {
  const start = fmt(ev.startDate);
  const range =
    ev.endDate && ev.endDate !== ev.startDate ? `${start} – ${fmt(ev.endDate)}` : start;
  return ev.time ? `${range}, ${ev.time}` : range;
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (!SECRET || searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = body?._id as string | undefined;

  // Ignore non-events and draft documents (drafts publish later as the real id).
  if (body?._type !== "cityEvent" || !id || id.startsWith("drafts.")) {
    return NextResponse.json({ skipped: "not a published event" });
  }

  try {
    const ev = await fetchEventFresh(id);
    if (!ev) return NextResponse.json({ skipped: "event not found" });
    if (ev.autoPost === false) return NextResponse.json({ skipped: "autoPost off" });

    // Don't announce events that already ended.
    const today = new Date().toISOString().slice(0, 10);
    if ((ev.endDate ?? ev.startDate) < today) {
      return NextResponse.json({ skipped: "event is in the past" });
    }

    const admin = createAdminClient();

    // Claim the event first — the unique event_id makes this our dedupe lock.
    // If the row already exists (23505) it was posted before → skip.
    const { error: claimErr } = await admin
      .from("social_posts")
      .insert({ event_id: ev._id });
    if (claimErr) {
      if (claimErr.code === "23505") {
        return NextResponse.json({ skipped: "already posted" });
      }
      throw claimErr;
    }

    // Build the shared content.
    const url = `${BASE_URL}${eventPath(ev)}`;
    const post: SocialPost = {
      title: ev.title,
      when: whenText(ev),
      location: ev.location,
      description: ev.description,
      url,
    };
    const caption = buildCaption(post);
    // Per-network sizing: Facebook takes any ratio so it gets the whole image;
    // Instagram gets it padded onto a legal canvas rather than cropped.
    const images = socialImageUrls(ev.coverImage);
    // A gallery becomes a carousel; a lone cover stays a single photo, since
    // Instagram rejects a one-slide carousel.
    const carousel = instagramCarouselUrls(ev.coverImage, ev.gallery);

    // Post to each network independently — one failing shouldn't block the other.
    const errors: string[] = [];
    let fbId: string | null = null;
    let igId: string | null = null;

    if (!FB_AUTOPOST) {
      errors.push("fb: auto-post disabled (post manually until App Review)");
    } else if (facebookConfigured()) {
      try {
        fbId = await postToFacebook(caption, url, images?.facebook ?? null);
      } catch (e) {
        errors.push(`fb: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      errors.push("fb: not configured");
    }

    if (instagramConfigured() && images) {
      try {
        igId =
          carousel && carousel.length > 1
            ? await postCarouselToInstagram(caption, carousel)
            : await postToInstagram(caption, images.instagram);
      } catch (e) {
        errors.push(`ig: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      errors.push(images ? "ig: not configured" : "ig: event has no cover image");
    }

    // Total failure → release the claim so a later re-publish can retry.
    if (!fbId && !igId) {
      await admin.from("social_posts").delete().eq("event_id", ev._id);
      console.error("[social/publish] all posts failed", errors);
      return NextResponse.json({ error: "all posts failed", errors }, { status: 502 });
    }

    await admin
      .from("social_posts")
      .update({
        fb_post_id: fbId,
        ig_post_id: igId,
        posted_at: new Date().toISOString(),
      })
      .eq("event_id", ev._id);

    return NextResponse.json({ posted: true, fb: fbId, ig: igId, errors });
  } catch (err) {
    console.error("[social/publish]", err);
    return NextResponse.json({ error: "publish failed" }, { status: 500 });
  }
}
