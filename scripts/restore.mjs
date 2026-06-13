// ════════════════════════════════════════════════════════════════════════════
//  Restore a backup made by scripts/backup.mjs back into Supabase.
//
//  Re-uploads every photo to Storage and upserts every table row (in
//  foreign-key-safe order, on each table's real primary key — so re-running is
//  idempotent and never duplicates).
//
//  ⚠ This WRITES to the live project. It is therefore a DRY RUN by default:
//    it prints exactly what it WOULD do and changes nothing. Add --apply to
//    actually write.
//
//  Usage:
//    node scripts/restore.mjs "<backup-folder>"            # dry run (safe)
//    node scripts/restore.mjs "<backup-folder>" --apply    # really restore
//    node scripts/restore.mjs "<backup-folder>" --apply --storage-only
//    node scripts/restore.mjs "<backup-folder>" --apply --tables-only
//
//  Example:
//    node scripts/restore.mjs "..\backups\2026-06-13T11-34-12" --apply
//
//  ── Important limitation ─────────────────────────────────────────────────────
//  Table rows reference auth.users by id (profiles.id, *.user_id …). This script
//  restores the public tables, NOT the auth users themselves — the Supabase admin
//  API cannot recreate a user with its original UUID. So:
//    • Accidental table wipe / bad migration (auth users still exist) → full
//      recovery. This is the common case.
//    • Total project loss (auth gone too) → photos restore fully; table rows that
//      reference a now-missing user will be reported as foreign-key failures.
//      auth_users.json still preserves the emails so you can re-invite people.
//  Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ── args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const folderArg = args.find((a) => !a.startsWith("--"));
if (!folderArg) {
  console.error("Usage: node scripts/restore.mjs \"<backup-folder>\" [--apply] [--storage-only|--tables-only]");
  process.exit(1);
}
const BACKUP = resolve(folderArg);
const APPLY = flags.has("--apply");
const doStorage = !flags.has("--tables-only");
const doTables = !flags.has("--storage-only");
if (!existsSync(BACKUP)) { console.error(`Backup folder not found: ${BACKUP}`); process.exit(1); }

// ── load .env.local ──────────────────────────────────────────────────────────
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env vars in .env.local");
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

console.log(`\n  Restore source : ${BACKUP}`);
console.log(`  Target project : ${url}`);
console.log(`  Mode           : ${APPLY ? "APPLY (writing!)" : "DRY RUN (no changes)"}\n`);

// ── table restore order (parents first) + conflict target (the real PK) ──────
const TABLE_ORDER = [
  ["profiles", "id"],
  ["agencies", "id"],
  ["agency_categories", "agency_id,category"],
  ["issues", "id"],
  ["agency_posts", "id"],
  ["issue_comments", "id"],
  ["issue_help_offers", "id"],
  ["issue_help_offer_comments", "id"],
  ["issue_affected", "issue_id,user_id"],
  ["issue_helpers", "issue_id,user_id"],
  ["issue_help_date_votes", "offer_id,user_id"],
  ["comment_likes", "comment_id,user_id"],
  ["comment_reports", "id"],
  ["issue_resolution_upvotes", "issue_id,user_id"],
  ["issue_status_log", "id"],
  ["ideas", "id"],
  ["idea_upvotes", "idea_id,user_id"],
  ["initiatives", "id"],
  ["initiative_votes", "initiative_id,user_id"],
  ["fund_campaigns", "id"],
  ["membership_requests", "id"],
  ["notifications", "id"],
  ["utility_posts", "id"],
];

// Database-generated columns that exist in a `select *` backup but CANNOT be
// inserted (Postgres rejects any value for GENERATED ALWAYS columns). `location`
// is the PostGIS geography auto-derived from lat/lng on issues/initiatives.
const GENERATED_COLS = ["location"];
function stripGenerated(rows) {
  return rows.map((row) => {
    const copy = { ...row };
    for (const c of GENERATED_COLS) delete copy[c];
    return copy;
  });
}

let warnings = 0;

// ── 1. storage ───────────────────────────────────────────────────────────────
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

if (doStorage) {
  const storageRoot = join(BACKUP, "storage");
  if (existsSync(storageRoot)) {
    for (const bucket of readdirSync(storageRoot)) {
      const bucketRoot = join(storageRoot, bucket);
      if (!statSync(bucketRoot).isDirectory()) continue;
      const files = walk(bucketRoot);
      console.log(`  storage/${bucket}: ${files.length} file(s)${APPLY ? "" : "  (dry run)"}`);
      if (!APPLY) continue;
      let ok = 0;
      for (const file of files) {
        const objectPath = relative(bucketRoot, file).split(sep).join("/");
        const body = readFileSync(file);
        const { error } = await supabase.storage.from(bucket).upload(objectPath, body, { upsert: true });
        if (error) { console.warn(`    ⚠ ${objectPath}: ${error.message}`); warnings++; }
        else ok++;
      }
      console.log(`    ↳ uploaded ${ok}/${files.length}`);
    }
  } else {
    console.log("  (no storage/ folder in this backup)");
  }
}

// ── 2. tables ────────────────────────────────────────────────────────────────
async function upsertTable(table, conflict) {
  const file = join(BACKUP, "tables", `${table}.json`);
  if (!existsSync(file)) return; // table wasn't in this backup
  const rows = stripGenerated(JSON.parse(readFileSync(file, "utf8")));
  if (!rows.length) { console.log(`  ${table.padEnd(28)} 0 rows (skip)`); return; }
  if (!APPLY) { console.log(`  ${table.padEnd(28)} ${rows.length} rows  (dry run)`); return; }

  const CHUNK = 500;
  let ok = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflict, ignoreDuplicates: false });
    if (error) { console.warn(`  ⚠ ${table}: ${error.message}`); warnings++; }
    else ok += chunk.length;
  }
  console.log(`  ✓ ${table.padEnd(28)} ${ok}/${rows.length} rows`);
}

if (doTables) {
  console.log("");
  for (const [table, conflict] of TABLE_ORDER) {
    await upsertTable(table, conflict);
  }
}

console.log(`\n  ${APPLY ? "Restore complete." : "Dry run complete — nothing was changed. Re-run with --apply to restore."}`);
if (warnings) console.log(`  (${warnings} warning(s) above.)`);
