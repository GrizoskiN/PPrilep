// ════════════════════════════════════════════════════════════════════════════
//  Full backup of the live Supabase project (database + storage files).
//
//  Why this exists: on the Free plan Supabase keeps NO automatic backups, so a
//  bad migration, an accidental delete, or an attack would be unrecoverable.
//  This pulls a complete local copy you control.
//
//  What it saves into  ../backups/<timestamp>/ :
//    • tables/<name>.json   — every row of every table (full SELECT *)
//    • auth_users.json      — account list incl. EMAILS (members/companies who
//                             gave money — profiles does not store the email)
//    • ../storage-pool/<bucket>/…  — the actual photo files (see note below)
//    • manifest.json        — what was backed up, row/file counts, timestamp
//
//  Run:   node scripts/backup.mjs            (saves to ppp/backups/)
//         node scripts/backup.mjs "D:\path"  (custom destination)
//
//  Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
//  The service-role key bypasses RLS so it sees EVERY row — keep these backups
//  private (they contain personal data); the destination is outside the git repo.
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync, mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// ── load .env.local (falls back to real env vars, e.g. in CI) ────────────────
const env = {};
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // no .env.local (e.g. CI) — rely on process.env below
}
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env vars in .env.local");

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── where to write ───────────────────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19); // 2026-06-13T14-22-05
const defaultRoot = fileURLToPath(new URL("../../backups", import.meta.url)); // ppp/backups (off the repo)
const OUT = join(process.argv[2] || defaultRoot, stamp);
mkdirSync(OUT, { recursive: true });

// ── every table to back up ───────────────────────────────────────────────────
// Missing tables are skipped with a warning, so this list can be a superset.
const TABLES = [
  // people & money
  "profiles", "membership_requests",
  // agencies
  "agencies", "agency_categories", "agency_posts",
  // issues + interactions
  "issues", "issue_affected", "issue_helpers", "issue_help_date_votes",
  "issue_help_offers", "issue_help_offer_comments", "issue_comments",
  "comment_likes", "comment_reports", "issue_resolution_upvotes",
  "issue_status_log",
  // ideas & initiatives
  "ideas", "idea_upvotes", "initiatives", "initiative_votes",
  // funding
  "fund_campaigns",
  // misc
  "notifications", "utility_posts",
];

const STORAGE_BUCKETS = ["issue-photos", "initiative-images"];

// Storage photos are downloaded ONCE, ever, into a single shared pool that lives
// beside the timestamped snapshots (not inside them). Photos are immutable —
// their storage keys carry a timestamp + random suffix — so an object already in
// the pool never needs re-downloading. This is the whole point: re-downloading
// every bucket on every run was the dominant source of Supabase cached egress
// (a full-bucket pull daily). We still re-download an object if its byte size no
// longer matches the pool copy (covers the rare upsert-in-place case). The DB
// dumps below are cheap and stay a fresh full snapshot per run.
const POOL = join(process.argv[2] || defaultRoot, "storage-pool");

const manifest = { startedAt: new Date().toISOString(), project: url, tables: {}, auth: {}, storage: {} };
let warnings = 0;

// ── 1. dump tables (paginated) ───────────────────────────────────────────────
mkdirSync(join(OUT, "tables"), { recursive: true });
for (const table of TABLES) {
  const rows = [];
  const PAGE = 1000;
  let from = 0;
  let failed = false;
  for (;;) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + PAGE - 1);
    if (error) {
      // 42P01 / PGRST205 = table doesn't exist — fine, just skip.
      console.warn(`  ⚠ ${table}: ${error.message}`);
      warnings++;
      failed = true;
      break;
    }
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  if (failed) continue;
  writeFileSync(join(OUT, "tables", `${table}.json`), JSON.stringify(rows, null, 2));
  manifest.tables[table] = rows.length;
  console.log(`  ✓ ${table.padEnd(28)} ${rows.length} rows`);
}

// ── 2. dump auth users (emails!) ─────────────────────────────────────────────
{
  const users = [];
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.warn(`  ⚠ auth users: ${error.message}`); warnings++; break; }
    users.push(...data.users.map((u) => ({
      id: u.id, email: u.email, phone: u.phone,
      created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
      provider: u.app_metadata?.provider, providers: u.app_metadata?.providers,
      full_name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
    })));
    if (data.users.length < 1000) break;
    page++;
  }
  writeFileSync(join(OUT, "auth_users.json"), JSON.stringify(users, null, 2));
  manifest.auth.users = users.length;
  console.log(`  ✓ auth_users                 ${users.length} accounts`);
}

// ── 3. sync storage files into the shared pool (incremental) ─────────────────
// Only objects missing from the pool (or whose size changed) are downloaded, so
// each photo costs egress exactly once instead of on every run.
async function syncFolder(bucket, prefix, stats) {
  let offset = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: PAGE, offset, sortBy: { column: "name", order: "asc" },
    });
    if (error) { console.warn(`  ⚠ ${bucket}/${prefix}: ${error.message}`); warnings++; return; }
    if (!data.length) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        // a folder — recurse
        await syncFolder(bucket, path, stats);
        continue;
      }
      const dest = join(POOL, bucket, path);
      const remoteSize = entry.metadata?.size;
      // Skip if we already hold a copy of the same size (no egress). When the
      // remote size is unknown we fall back to "present on disk = keep".
      if (existsSync(dest) && (remoteSize == null || statSync(dest).size === remoteSize)) {
        stats.skipped++;
        continue;
      }
      const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(path);
      if (dlErr) { console.warn(`  ⚠ download ${bucket}/${path}: ${dlErr.message}`); warnings++; continue; }
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, Buffer.from(await blob.arrayBuffer()));
      stats.downloaded++;
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
}

for (const bucket of STORAGE_BUCKETS) {
  const stats = { downloaded: 0, skipped: 0 };
  await syncFolder(bucket, "", stats);
  manifest.storage[bucket] = stats;
  console.log(
    `  ✓ storage/${bucket.padEnd(20)} ${stats.downloaded} new, ${stats.skipped} cached`,
  );
}

// ── 4. manifest ──────────────────────────────────────────────────────────────
manifest.finishedAt = new Date().toISOString();
manifest.warnings = warnings;
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`\n  Backup complete → ${OUT}`);
if (warnings) console.log(`  (${warnings} warning(s) above — usually tables that don't exist; safe to ignore.)`);
