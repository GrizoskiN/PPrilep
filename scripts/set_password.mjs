// One-off: set a user's password via the Supabase admin API.
//
//   node scripts/set_password.mjs <email> <new-password>
//   node scripts/set_password.mjs komunalec@mojprilep.mk komunalec1
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── args ─────────────────────────────────────────────────────────────────────
const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node scripts/set_password.mjs <email> <new-password>");
  process.exit(1);
}
if (password.length < 6) {
  console.error("Supabase requires a password of at least 6 characters.");
  process.exit(1);
}

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

async function findUserByEmail(target) {
  // listUsers is paginated; scan a few pages defensively.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

const user = await findUserByEmail(email);
if (!user) {
  console.error(`No user found for ${email}`);
  process.exit(1);
}

const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
if (error) {
  console.error("Failed to update password: " + error.message);
  process.exit(1);
}

console.log(`✓ Password updated for ${email}`);
