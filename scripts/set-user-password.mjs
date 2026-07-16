// One-off admin utility: set a user's password by email.
//
//   node scripts/set-user-password.mjs <email> <new-password>
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
// The service-role key never leaves your machine. Do not commit passwords.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Load .env.local without extra deps
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node scripts/set-user-password.mjs <email> <new-password>");
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Find the user by email (paginate until found)
let user = null;
for (let page = 1; page <= 20 && !user; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error("listUsers failed:", error.message); process.exit(1); }
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (data.users.length < 1000) break;
}

if (!user) { console.error(`No user found with email ${email}`); process.exit(1); }

const { error } = await admin.auth.admin.updateUserById(user.id, { password });
if (error) { console.error("Password update failed:", error.message); process.exit(1); }

console.log(`✅ Password updated for ${email} (id ${user.id})`);
