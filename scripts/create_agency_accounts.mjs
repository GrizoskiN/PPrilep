// One-off: create the 5 institution operator accounts (auto-confirmed) and bind
// each to its agency. Idempotent — safe to re-run (e.g. after running the
// add_agencies.sql migration so the agency_id binding can take effect).
//
//   node scripts/create_agency_accounts.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// ── load .env.local ──────────────────────────────────────────────────────────
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env vars in .env.local");

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── the 5 accounts ───────────────────────────────────────────────────────────
const ACCOUNTS = [
  { agency_id: "vodovod",           email: "vodovod@mojprilep.mk",      name: "Водовод" },
  { agency_id: "komunalec",         email: "komunalec@mojprilep.mk",    name: "Комуналец" },
  { agency_id: "osvetluvanje",      email: "osvetluvanje@mojprilep.mk", name: "Јавно осветлување" },
  { agency_id: "transport_parking", email: "prevoz@mojprilep.mk",       name: "Јавен превоз и паркинзи" },
  { agency_id: "municipality",      email: "opstina@mojprilep.mk",      name: "Општина Прилеп" },
];

function strongPassword() {
  // 16 chars, url-safe; readable enough to paste.
  return randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) + "9aZ!";
}

async function findUserByEmail(email) {
  // listUsers is paginated; scan a few pages defensively.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

const results = [];

for (const acc of ACCOUNTS) {
  let user = await findUserByEmail(acc.email);
  let password = null;

  if (!user) {
    password = strongPassword();
    const { data, error } = await supabase.auth.admin.createUser({
      email: acc.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: acc.name },
    });
    if (error) {
      results.push({ email: acc.email, status: "ERROR create: " + error.message });
      continue;
    }
    user = data.user;
  }

  // Bind agency_id (+ ensure full_name). No-ops harmlessly if not yet migrated.
  const { error: updErr } = await supabase
    .from("profiles")
    .update({ agency_id: acc.agency_id, full_name: acc.name })
    .eq("id", user.id);

  const bind = updErr
    ? (updErr.message.includes("agency_id") || updErr.code === "PGRST204"
        ? "agency_id column missing — run add_agencies.sql then re-run this script"
        : "bind error: " + updErr.message)
    : "bound → " + acc.agency_id;

  results.push({
    email: acc.email,
    password: password ?? "(unchanged — already existed)",
    bind,
  });
}

console.log("\n=== Agency operator accounts ===\n");
for (const r of results) {
  console.log(r.email);
  if (r.status) { console.log("  " + r.status); continue; }
  console.log("  password: " + r.password);
  console.log("  " + r.bind);
  console.log("");
}
