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
 *       Filter:  _type in ["post", "project", "cityEvent"]
 *       HTTP method: POST
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

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

    // Always revalidate the home page (it may show recent posts/events)
    revalidatePath("/", "page");

    return NextResponse.json({
      revalidated: true,
      type: docType ?? "all",
      now: Date.now(),
    });
  } catch (err) {
    console.error("[revalidate]", err);
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 });
  }
}
