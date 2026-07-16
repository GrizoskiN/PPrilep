import { createClient as createServerClient } from "../../../../lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// DELETE /api/account/delete
// Deletes the calling user's own account. Uses service role for the hard delete.
//
// Auth accepts EITHER the browser session cookie (web) OR an
// `Authorization: Bearer <access_token>` header (the native app, which has no
// cookies) — so the same route serves both clients.

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

  // Hard-delete the auth user
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
