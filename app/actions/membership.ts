"use server";

import { createClient } from "../../lib/supabase/server";

export type MembershipTier =
  | "volunteer"
  | "monthly"
  | "yearly"
  | "company_basic"
  | "company_preferred"
  | "company_premium";

/** Save the calling user's own membership tier */
export async function saveMembershipTier(tier: MembershipTier) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ membership_tier: tier })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { ok: true };
}

/** Admin: set any user's membership tier */
export async function adminSetMembershipTier(
  targetUserId: string,
  tier: MembershipTier | null,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check is_admin via the SECURITY DEFINER function
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { error: "Forbidden" };

  const { error, count } = await supabase
    .from("profiles")
    .update({ membership_tier: tier }, { count: "exact" })
    .eq("id", targetUserId);

  if (error) return { error: error.message };
  if (count === 0) return { error: "Нема промена — проверете ги SQL политиките (RLS)" };
  return { ok: true };
}

/** Admin: fetch all profiles with their membership tier */
export async function adminFetchMembers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: null };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { error: "Forbidden", data: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, points, membership_tier, created_at")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}
