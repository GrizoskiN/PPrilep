"use server";

import { createClient } from "../../lib/supabase/server";

export interface BusRow {
  id: number;
  label: string;
  flespi_device_id: number;
  active_line_id: string | null;
  is_active: boolean;
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Only site admins and the Јавен превоз operator (agency_id 'transport_parking')
// may manage the fleet. Returns an error string, or null if allowed.
async function assertOperator(supabase: ServerClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const [{ data: isAdmin }, { data: agencyId }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("current_user_agency"),
  ]);
  if (!isAdmin && agencyId !== "transport_parking") return "Forbidden";
  return null;
}

// ── Operator/admin: list the fleet ────────────────────────────────────────────
export async function fetchBuses() {
  const supabase = await createClient();
  const err = await assertOperator(supabase);
  if (err) return { error: err, data: null };

  const { data, error } = await supabase
    .from("buses")
    .select("id,label,flespi_device_id,active_line_id,is_active")
    .order("id");

  if (error) return { error: error.message, data: null };
  return { data: data as BusRow[], error: null };
}

// ── Operator/admin: reassign a bus's line and/or toggle it in service ─────────
export async function updateBus(
  id: number,
  patch: { active_line_id?: string | null; is_active?: boolean },
) {
  const supabase = await createClient();
  const err = await assertOperator(supabase);
  if (err) return { error: err };

  const update: Record<string, unknown> = {};
  if ("active_line_id" in patch) update.active_line_id = patch.active_line_id;
  if ("is_active" in patch) update.is_active = patch.is_active;
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("buses").update(update).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}
