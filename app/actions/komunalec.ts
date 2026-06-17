"use server";

import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";
import { createNotification } from "../../lib/notifications";
import { sendKomunalecRequest } from "../../lib/email";
import type {
  KomunalecRequestType,
  KomunalecRequestStatus,
} from "../../lib/types/database";

const REQUEST_TYPE_LABELS: Record<KomunalecRequestType, string> = {
  complaint: "поплака",
  container: "нарачка на контејнер",
  tractor: "нарачка на трактор",
};

export interface KomunalecRequestInput {
  request_type: KomunalecRequestType;
  category?: string | null;
  full_name: string;
  phone: string;
  address?: string | null;
  district?: string | null;
  message?: string | null;
  photo_url?: string | null;
  scheduled_at?: string | null;
}

// ── Resolve the Комуналец operator(s): profile ids + emails ───────────────────
async function komunalecOperators() {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id")
    .eq("agency_id", "komunalec");

  const ids = (profiles ?? []).map((p) => p.id as string);
  const emails: string[] = [];
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data.user?.email) emails.push(data.user.email);
  }
  return { ids, emails };
}

// ── Submit a Комуналец request (logged-in users only) ─────────────────────────
export async function submitKomunalecRequest(input: KomunalecRequestInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Најавете се за да испратите барање." };

  if (!input.full_name?.trim() || !input.phone?.trim()) {
    return { error: "Внесете име и телефон." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("komunalec_requests").insert({
    user_id: user.id,
    request_type: input.request_type,
    category: input.request_type === "complaint" ? input.category ?? null : null,
    full_name: input.full_name.trim(),
    phone: input.phone.trim(),
    address: input.address?.trim() || null,
    district: input.district || null,
    message: input.message?.trim() || null,
    photo_url: input.photo_url || null,
    // Scheduling only applies to container/tractor orders.
    scheduled_at:
      input.request_type === "complaint" ? null : input.scheduled_at || null,
  });

  if (error) return { error: error.message };

  // Notify the operator(s): free in-app notification + one email each.
  const { ids, emails } = await komunalecOperators();
  const typeLabel = REQUEST_TYPE_LABELS[input.request_type];

  await Promise.all([
    ...ids.map((operatorId) =>
      createNotification(admin, {
        recipientUserId: operatorId,
        actorUserId: user.id,
        type: "issue_for_agency",
        title: "Ново барање за Комуналец",
        body: `${input.full_name.trim()} испрати ${typeLabel}.`,
        link: "/agency/komunalec",
      }),
    ),
    emails.length
      ? sendKomunalecRequest(emails, {
          requestType: input.request_type,
          category: input.request_type === "complaint" ? input.category ?? null : null,
          fullName: input.full_name.trim(),
          phone: input.phone.trim(),
          address: input.address?.trim() || null,
          district: input.district || null,
          message: input.message?.trim() || null,
          scheduledAt:
            input.request_type === "complaint"
              ? null
              : input.scheduled_at || null,
        }).catch(console.error)
      : Promise.resolve(),
  ]);

  return { ok: true };
}

// ── Operator/admin: update a request's status ─────────────────────────────────
export async function setKomunalecRequestStatus(
  id: number,
  status: KomunalecRequestStatus,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [{ data: isAdmin }, { data: agencyId }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("current_user_agency"),
  ]);
  if (!isAdmin && agencyId !== "komunalec") return { error: "Forbidden" };

  const { error } = await supabase
    .from("komunalec_requests")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };
  return { ok: true };
}

// ── Operator/admin: list requests ─────────────────────────────────────────────
export async function fetchKomunalecRequests() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: null };

  const [{ data: isAdmin }, { data: agencyId }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("current_user_agency"),
  ]);
  if (!isAdmin && agencyId !== "komunalec")
    return { error: "Forbidden", data: null };

  const { data, error } = await supabase
    .from("komunalec_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}
