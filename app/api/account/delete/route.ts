import { createClient as createServerClient } from "../../../../lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// DELETE /api/account/delete
// Deletes the calling user's own account. Uses service role for the hard delete.

export async function DELETE() {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Не сте најавени" }, { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

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
