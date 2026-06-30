"use server";

import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";
import { createNotification } from "../../lib/notifications";
import { sendKomunalecRequest } from "../../lib/email";
import { KOMUNALEC_REQUEST_RECIPIENTS } from "../../lib/agencies";
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

// ── Resolve the Комуналец operator profile id(s) for in-app notifications ─────
async function komunalecOperatorIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id")
    .eq("agency_id", "komunalec");
  return (profiles ?? []).map((p) => p.id as string);
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

  // ── Anti-spam ──────────────────────────────────────────────────────────────
  // Logged-in-only already blocks anonymous flooding; on top of that, throttle
  // each user to one request / 30s and cap them at 10 open requests per day.
  const since30s = new Date(Date.now() - 30_000).toISOString();
  const since24h = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: recent }, { count: daily }] = await Promise.all([
    admin
      .from("komunalec_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since30s),
    admin
      .from("komunalec_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since24h),
  ]);
  if ((recent ?? 0) > 0) {
    return { error: "Почекајте малку пред да испратите ново барање." };
  }
  if ((daily ?? 0) >= 10) {
    return { error: "Достигнавте дневен лимит на барања. Обидете се утре." };
  }

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

  // Notify the operator(s) in-app (free); email goes to the Комуналец press
  // inbox plus our shared inbox (see KOMUNALEC_REQUEST_RECIPIENTS).
  const ids = await komunalecOperatorIds();
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
    sendKomunalecRequest(KOMUNALEC_REQUEST_RECIPIENTS, {
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
    }).catch(console.error),
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
