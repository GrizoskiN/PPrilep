import { createClient as createServerClient } from "../../../../lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// DELETE /api/account/delete
// Deletes the calling user's own account. Uses service role for the hard delete.
//
// Auth accepts EITHER the browser session cookie (web) OR an
// `Authorization: Bearer <access_token>` header (the native app, which has no
// cookies) — so the same route serves both clients.
//
// What survives the delete: issues (reported_by → null) and ideas (created_by →
// null) stay, rendered as "Анонимно" by the UI. What is cascade-deleted: the
// profile, the user's votes/comments/upvotes/initiatives/ideas/help-offers.
// Storage has no DB cascade, so we clean the user's uploaded files here — their
// avatar and their (now-deleted) initiatives' images. Issue photos are left
// because the issues themselves survive.

// Parse a Supabase public storage URL into { bucket, path }. Returns null for
// anything that isn't one of our storage URLs (e.g. a Google OAuth avatar).
function parseStorageUrl(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/);
  if (!m) return null;
  let path = m[2];
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep raw path */
  }
  return { bucket: m[1], path };
}

// Best-effort: remove a set of storage files grouped by bucket. Never throws —
// the account is already gone; orphaned files are a nuisance, not a failure.
async function removeFiles(
  admin: SupabaseClient,
  refs: ({ bucket: string; path: string } | null)[],
): Promise<void> {
  const byBucket = new Map<string, Set<string>>();
  for (const ref of refs) {
    if (!ref) continue;
    if (!byBucket.has(ref.bucket)) byBucket.set(ref.bucket, new Set());
    byBucket.get(ref.bucket)!.add(ref.path);
  }
  for (const [bucket, paths] of byBucket) {
    try {
      await admin.storage.from(bucket).remove([...paths]);
    } catch (e) {
      console.error(`account delete: storage cleanup failed for ${bucket}`, e);
    }
  }
}

export async function DELETE(request: Request) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Resolve the caller: prefer the Bearer token (mobile), fall back to cookies.
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  let userId: string | null = null;
  if (bearer) {
    const { data, error } = await admin.auth.getUser(bearer);
    if (!error && data.user) userId = data.user.id;
  } else {
    const supabase = await createServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Не сте најавени" }, { status: 401 });
  }
  const user = { id: userId };

  // Collect the user's storage files BEFORE deleting — the cascade will drop the
  // profile and initiatives rows, so we need their URLs now.
  const fileRefs: ({ bucket: string; path: string } | null)[] = [];

  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  fileRefs.push(parseStorageUrl(profile?.avatar_url));

  const { data: initiatives } = await admin
    .from("initiatives")
    .select("cover_image_url, image_urls, completion_images")
    .eq("user_id", user.id);
  for (const ini of initiatives ?? []) {
    fileRefs.push(parseStorageUrl(ini.cover_image_url));
    for (const u of (ini.image_urls ?? []) as string[]) fileRefs.push(parseStorageUrl(u));
    for (const u of (ini.completion_images ?? []) as string[]) fileRefs.push(parseStorageUrl(u));
  }

  // Anonymise the profile first (keep row for foreign-key consistency,
  // but wipe personal data)
  await admin
    .from("profiles")
    .update({
      username: null,
      full_name: null,
      avatar_url: null,
      street_name: null,
      district: null,
    })
    .eq("id", user.id);

  // Hard-delete the auth user (cascades to profile + initiatives + votes etc.)
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Account is gone — now sweep the orphaned files (best-effort).
  await removeFiles(admin, fileRefs);

  return NextResponse.json({ ok: true });
}
