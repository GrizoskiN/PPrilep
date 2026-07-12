/**
 * Fleet management for the Мој Прилеп mobile app (and any Bearer/cookie client).
 *
 *   GET   /api/buses/manage         → list the fleet (id, label, plate-less)
 *   PATCH /api/buses/manage         → { id, active_line_id?, is_active? }
 *
 * The web uses the `updateBus` server action (cookie session); the native app
 * has no cookies, so this route exposes the same capability over a Bearer token.
 * Authorization mirrors the buses-table RLS: site admins (profiles.is_admin) OR
 * the Јавен превоз operator (profiles.agency_id = 'transport_parking'). The gate
 * is checked here against the requester's profile via the service role, so the
 * data reads/writes below can safely use the admin client.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getRequestUser } from "../../../../lib/supabase/request-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_CACHE = { "Cache-Control": "private, no-store" };

// Resolve the requester and confirm they may manage the fleet. Returns the
// admin client on success, or a NextResponse to return on failure.
async function authorize(req: Request) {
  const user = await getRequestUser(req).catch(() => null);
  if (!user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: NO_CACHE }) };
  }
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("is_admin, agency_id")
    .eq("id", user.id)
    .single();
  const allowed = prof?.is_admin === true || prof?.agency_id === "transport_parking";
  if (!allowed) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_CACHE }) };
  }
  return { admin };
}

export async function GET(req: Request) {
  const auth = await authorize(req);
  if (auth.error) return auth.error;

  const { data, error } = await auth.admin
    .from("buses")
    .select("id,label,active_line_id,is_active")
    .order("id");

  if (error) {
    console.error("[buses/manage] list", error.message);
    return NextResponse.json({ error: "Could not load fleet." }, { status: 500, headers: NO_CACHE });
  }
  return NextResponse.json({ buses: data ?? [] }, { headers: NO_CACHE });
}

export async function PATCH(req: Request) {
  const auth = await authorize(req);
  if (auth.error) return auth.error;

  const body = (await req.json().catch(() => ({}))) as {
    id?: number;
    active_line_id?: string | null;
    is_active?: boolean;
  };
  if (typeof body.id !== "number") {
    return NextResponse.json({ error: "Missing bus id." }, { status: 400, headers: NO_CACHE });
  }

  const update: Record<string, unknown> = {};
  if ("active_line_id" in body) update.active_line_id = body.active_line_id ?? null;
  if ("is_active" in body) update.is_active = body.is_active === true;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true }, { headers: NO_CACHE });
  }

  const { error } = await auth.admin.from("buses").update(update).eq("id", body.id);
  if (error) {
    console.error("[buses/manage] update", error.message);
    return NextResponse.json({ error: "Could not save." }, { status: 500, headers: NO_CACHE });
  }
  return NextResponse.json({ ok: true }, { headers: NO_CACHE });
}
