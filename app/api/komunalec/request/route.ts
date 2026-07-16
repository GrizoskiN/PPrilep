import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createNotification } from "../../../../lib/notifications";
import { sendKomunalecRequest } from "../../../../lib/email";
import { KOMUNALEC_REQUEST_RECIPIENTS } from "../../../../lib/agencies";
import type { KomunalecRequestType } from "../../../../lib/types/database";

const REQUEST_TYPE_LABELS: Record<KomunalecRequestType, string> = {
  complaint: "поплака",
  container: "нарачка на контејнер",
  tractor: "нарачка на трактор",
};

async function komunalecOperatorIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id")
    .eq("agency_id", "komunalec");
  return (profiles ?? []).map((p) => p.id as string);
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    
    if (!token) {
      return NextResponse.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Најавете се за да испратите барање." }, { status: 401 });
    }

    const input = await req.json();

    if (!input.request_type || !REQUEST_TYPE_LABELS[input.request_type as KomunalecRequestType]) {
      return NextResponse.json({ error: "Невалиден тип на барање." }, { status: 400 });
    }
    
    if (!input.full_name?.trim() || !input.phone?.trim()) {
      return NextResponse.json({ error: "Внесете име и телефон." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Anti-spam
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
      return NextResponse.json({ error: "Почекајте малку пред да испратите ново барање." }, { status: 429 });
    }
    if ((daily ?? 0) >= 10) {
      return NextResponse.json({ error: "Достигнавте дневен лимит на барања. Обидете се утре." }, { status: 429 });
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
      scheduled_at: input.request_type === "complaint" ? null : input.scheduled_at || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ids = await komunalecOperatorIds();
    const typeLabel = REQUEST_TYPE_LABELS[input.request_type as KomunalecRequestType];

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
        scheduledAt: input.request_type === "complaint" ? null : input.scheduled_at || null,
      }).catch(console.error),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
