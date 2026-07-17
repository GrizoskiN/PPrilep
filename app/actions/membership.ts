"use server";

import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";
import {
  sendVolunteerWelcome,
  sendRequestReceived,
  sendAdminNotification,
  sendApprovalConfirmation,
  sendRejectionNotice,
} from "../../lib/email";

export type MembershipTier =
  | "volunteer"
  | "monthly"
  | "yearly"
  | "mega_donor"
  | "mega_donator"
  | "company_basic"
  | "company_preferred"
  | "company_premium";

// Monthly membership lasts one month from the moment it's granted; after that a
// scheduled job (see supabase/add_membership_expiry.sql) downgrades the member
// back to volunteer. Returns the profile patch to apply when writing a tier so
// `membership_expires_at` stays in sync with the tier.
function tierPatch(tier: MembershipTier | null) {
  const patch: { membership_tier: MembershipTier | null; membership_expires_at: string | null } =
    { membership_tier: tier, membership_expires_at: null };
  if (tier === "monthly") {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    patch.membership_expires_at = d.toISOString();
  }
  return patch;
}

// ── Submit a membership request ───────────────────────────────────────────────

import { type User } from "@supabase/supabase-js";

export async function submitMembershipRequest(
  data: {
    tier: MembershipTier;
    full_name: string;
    email: string;
    phone?: string;
    message?: string;
    // company-only
    company?: string;
    contact?: string;
  },
  overrideUser?: User | null
) {
  const supabase = await createClient();
  const { data: { user: sessionUser } } = await supabase.auth.getUser();
  const user = overrideUser !== undefined ? overrideUser : sessionUser;

  const displayName = data.company ?? data.full_name;
  const isVolunteer = data.tier === "volunteer";

  // ── Volunteer: auto-approve immediately ──────────────────────────────────
  if (isVolunteer) {
    if (user) {
      await createAdminClient().from("profiles")
        .update(tierPatch("volunteer"))
        .eq("id", user.id);
    }
    await sendVolunteerWelcome(data.email, displayName).catch(console.error);
    return { ok: true, approved: true };
  }

  // ── Paid tier: save as pending ────────────────────────────────────────────
  // Use admin client to bypass RLS — server action already validates the user
  const admin = createAdminClient();
  const { data: req, error } = await admin
    .from("membership_requests")
    .insert({
      user_id:   user?.id ?? null,
      full_name: displayName,
      email:     data.email,
      phone:     data.phone ?? null,
      message:   data.message ?? null,
      tier:      data.tier,
      status:    "pending",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Send confirmation to user + notification to admin (in parallel, non-blocking)
  await Promise.all([
    sendRequestReceived(data.email, displayName, data.tier).catch(console.error),
    sendAdminNotification(
      displayName, data.email, data.phone ?? null,
      data.tier, data.message ?? null, req.id,
    ).catch(console.error),
  ]);

  return { ok: true, approved: false };
}

// ── Admin: approve a pending request ─────────────────────────────────────────

export async function adminApproveMembership(requestId: number) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { error: "Forbidden" };

  // Fetch the request
  const { data: req, error: fetchErr } = await supabase
    .from("membership_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) return { error: "Request not found" };

  // Mark approved
  await supabase.from("membership_requests")
    .update({ status: "approved" })
    .eq("id", requestId);

  // Set tier on profile if user is registered. membership_tier is a privileged
  // column — only the service-role client may write it (see harden_profiles_rls).
  if (req.user_id) {
    await createAdminClient().from("profiles")
      .update(tierPatch(req.tier))
      .eq("id", req.user_id);
  }

  // Send approval email
  await sendApprovalConfirmation(req.email, req.full_name, req.tier).catch(console.error);

  return { ok: true };
}

// ── Admin: reject a pending request ──────────────────────────────────────────

export async function adminRejectMembership(requestId: number) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { error: "Forbidden" };

  const { data: req, error: fetchErr } = await supabase
    .from("membership_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) return { error: "Request not found" };

  await supabase.from("membership_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);

  await sendRejectionNotice(req.email, req.full_name).catch(console.error);

  return { ok: true };
}

// ── Save own membership tier (used internally) ────────────────────────────────

export async function saveMembershipTier(tier: MembershipTier) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Privileged column — must go through the service-role client.
  const { error } = await createAdminClient()
    .from("profiles")
    .update(tierPatch(tier))
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { ok: true };
}

// ── Admin: set any user's tier directly ──────────────────────────────────────

export async function adminSetMembershipTier(
  targetUserId: string,
  tier: MembershipTier | null,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { error: "Forbidden" };

  // membership_tier is a privileged column writable only by the service role
  // (see harden_profiles_rls). is_admin was already verified above.
  const { error, count } = await createAdminClient()
    .from("profiles")
    .update(tierPatch(tier), { count: "exact" })
    .eq("id", targetUserId);

  if (error) return { error: error.message };
  if (count === 0) return { error: "Нема промена — корисникот не е пронајден" };
  return { ok: true };
}

// ── Admin: fetch all membership requests ──────────────────────────────────────

export async function adminFetchRequests() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { error: "Forbidden", data: null };

  const { data, error } = await supabase
    .from("membership_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ── Admin: fetch all profiles ─────────────────────────────────────────────────

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
