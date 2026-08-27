/**
 * POST /api/revalidate
 *
 * Called by a Sanity webhook whenever content is published or unpublished.
 * Purges the ISR cache for the affected pages so the live site updates
 * within seconds — without needing a full redeploy.
 *
 * Setup:
 *  1. Add SANITY_REVALIDATE_SECRET to your Vercel env vars (any random string).
 *  2. In Sanity → sanity.io/manage → your project → API → Webhooks:
 *       URL:     https://www.mojprilep.mk/api/revalidate?secret=<your-secret>
 *       Trigger: Create, Update, Delete
 *       Filter:  _type in ["post", "project", "cityEvent", "sportClub", "sportPost"]
 *       HTTP method: POST
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { broadcastNewEvent } from "@/lib/push/newEvent";
import { broadcastNewSportPost } from "@/lib/push/sportPost";

const SECRET = process.env.SANITY_REVALIDATE_SECRET;

export async function POST(req: Request) {
  // Validate secret
  const { searchParams } = new URL(req.url);
  if (!SECRET || searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const docType = body?._type as string | undefined;

    // Revalidate based on which document type changed. Both the rendered path
    // AND the tagged Sanity fetch must be purged — the list fetchers cache data
    // by tag, so revalidatePath alone would re-render with stale data.
    if (!docType || docType === "post") {
      revalidateTag("positive", "max");
      revalidatePath("/positive", "page");
      revalidatePath("/positive/[slug]", "page");
    }
    if (!docType || docType === "project") {
      revalidateTag("projects", "max");
      revalidatePath("/projects", "page");
      revalidatePath("/projects/[slug]", "page");
    }
    if (!docType || docType === "cityEvent") {
      revalidateTag("events", "max");
      revalidatePath("/events", "page");
    }
    if (!docType || docType === "sportClub" || docType === "sportPost") {
      revalidateTag("sport", "max");
      revalidatePath("/sport", "page");
      revalidatePath("/sport/[slug]", "page");
    }

    // Always revalidate the home page (it may show recent posts/events)
    revalidatePath("/", "page");

    // A newly published event also notifies the app. This piggybacks on the
    // revalidate hook because the Sanity plan only includes two webhooks and
    // both slots are taken — /api/push/event exists but has nothing calling it.
    // broadcastNewEvent is idempotent (unique claim in push_broadcasts), so
    // every later edit of the same event is a no-op.
    let push: unknown = undefined;
    if (docType === "cityEvent") {
      try {
        push = await broadcastNewEvent(body?._id as string | undefined);
      } catch (e) {
        // Never let a push problem fail the revalidation — stale content on the
        // site is the worse of the two failures.
        console.error("[revalidate] push", e);
      }
    }
    // A newly published club post notifies that club's followers (only). Same
    // idempotent, best-effort contract as the event broadcast above.
    if (docType === "sportPost") {
      try {
        push = await broadcastNewSportPost(body?._id as string | undefined);
      } catch (e) {
        console.error("[revalidate] sport push", e);
      }
    }

    return NextResponse.json({
      revalidated: true,
      type: docType ?? "all",
      push,
      now: Date.now(),
    });
  } catch (err) {
    console.error("[revalidate]", err);
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 });
  }
}
