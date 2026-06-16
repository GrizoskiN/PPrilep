import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sweepOrphans } from "../../../../lib/storage-cleanup";

// GET /api/cron/cleanup-orphans
//
// Weekly orphaned-photo sweep, run by Vercel Cron (see vercel.json). Deletes
// files in the issue-photos bucket that no DB row references and are older than
// 7 days — the recurring half of the photo-cleanup story (the app deletes the
// owner's own photos instantly on post-delete; this mops up the rest, e.g.
// comment images uploaded by other users).
//
// Auth: Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`
// when the CRON_SECRET env var is set. We require it so the endpoint can't be
// triggered by the public. The same secret lets you trigger a run manually.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const result = await sweepOrphans(admin, { olderThanDays: 7, apply: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sweep failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
