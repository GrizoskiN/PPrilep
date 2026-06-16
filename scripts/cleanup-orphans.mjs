// ════════════════════════════════════════════════════════════════════════════
//  Sweep ORPHANED files from the `issue-photos` bucket.
//
//  An orphan = a file that NO database row references — left behind by a deleted
//  post or comment, a replaced photo, or an abandoned upload. Supabase Storage
//  has no DB cascade, so these accumulate and eat the Free-tier quota.
//
//  This is the recurring half of the cleanup story:
//    • When a post is deleted, the app immediately removes the photos the deleter
//      owns (IssueDetail.cleanupIssuePhotos).
//    • Some files survive that — most importantly comment images uploaded by
//      OTHER users (an owner can't delete someone else's files). This sweep mops
//      those up, plus any other orphan.
//
//  ── Safety (this DELETES files, so it is conservative) ───────────────────────
//    1. References are gathered by scanning the FULL JSON of every row in REF_TABLES
//       for any "/issue-photos/<path>" — it can't miss a column.
//    2. A file is only deleted if it is BOTH unreferenced AND older than
//       --older-than-days (default 7). That age floor is the "1 week" grace, and
//       it protects in-flight uploads (a photo uploaded just before its row) and
//       gives a restore window: restore a deleted post within the week and its
//       photos become referenced again, so they're never swept.
//    3. DRY RUN by default — prints what it WOULD delete. Add --apply to delete.
//
//  Run:
//    node scripts/cleanup-orphans.mjs                       # dry run (safe)
//    node scripts/cleanup-orphans.mjs --apply               # delete orphans >7d
//    node scripts/cleanup-orphans.mjs --apply --older-than-days 14
//    node scripts/cleanup-orphans.mjs --apply --older-than-days 0   # all orphans
//
//  Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
//  (Service role bypasses RLS, so the sweep works regardless of bucket policies.)
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ageIdx = args.indexOf("--older-than-days");
const OLDER_THAN_DAYS = ageIdx >= 0 ? Number(args[ageIdx + 1]) : 7;
if (Number.isNaN(OLDER_THAN_DAYS) || OLDER_THAN_DAYS < 0) {
  console.error("--older-than-days must be a non-negative number");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = "issue-photos";
// Every table that could store an issue-photos URL (a superset is safe — extra
// tables only ever PROTECT files from deletion, never endanger them).
const REF_TABLES = ["issues", "issue_comments", "issue_change_requests", "profiles", "agency_posts"];
const PATH_RE = new RegExp(`/${BUCKET}/([^"'?#\\\\\\s]+)`, "g");

console.log(`\n  Bucket          : ${BUCKET}`);
console.log(`  Grace (age)     : delete only orphans older than ${OLDER_THAN_DAYS} day(s)`);
console.log(`  Mode            : ${APPLY ? "APPLY (deleting!)" : "DRY RUN (no changes)"}\n`);

// ── 1. collect referenced paths ──────────────────────────────────────────────
const referenced = new Set();
for (const table of REF_TABLES) {
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + 999);
    if (error) { console.warn(`  (skip ${table}: ${error.message})`); break; }
    for (const row of data) {
      let m;
      const json = JSON.stringify(row);
      while ((m = PATH_RE.exec(json)) !== null) {
        try { referenced.add(decodeURIComponent(m[1])); } catch { referenced.add(m[1]); }
      }
    }
    if (data.length < 1000) break;
    from += 1000;
  }
}

// ── 2. list every file in the bucket ─────────────────────────────────────────
async function listAll(prefix) {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: 1000, offset, sortBy: { column: "name", order: "asc" },
    });
    if (error) { console.warn(`  (list ${prefix}: ${error.message})`); break; }
    if (!data.length) break;
    for (const e of data) {
      const path = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) out.push(...await listAll(path));
      else out.push({ path, createdAt: e.created_at, size: Number(e.metadata?.size) || 0 });
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

const files = await listAll("");
const now = Date.now();
const cutoff = OLDER_THAN_DAYS * 86_400_000;

const orphans = files.filter((f) => !referenced.has(f.path));
const ageOf = (f) => (f.createdAt ? now - new Date(f.createdAt).getTime() : Infinity);
const toDelete = orphans.filter((f) => ageOf(f) >= cutoff);
const tooYoung = orphans.filter((f) => ageOf(f) < cutoff);

const mb = (b) => (b / 1024 / 1024).toFixed(2);
console.log(`  Referenced      : ${referenced.size} file(s)`);
console.log(`  In bucket       : ${files.length} file(s)`);
console.log(`  Orphaned        : ${orphans.length} (${mb(orphans.reduce((s, f) => s + f.size, 0))} MB)`);
console.log(`  → old enough    : ${toDelete.length} (${mb(toDelete.reduce((s, f) => s + f.size, 0))} MB)`);
console.log(`  → within grace  : ${tooYoung.length} (kept)\n`);

if (!toDelete.length) {
  console.log("  Nothing to delete.");
  process.exit(0);
}

for (const f of toDelete.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))) {
  const ageDays = f.createdAt ? Math.floor(ageOf(f) / 86_400_000) : "?";
  console.log(`    ${APPLY ? "delete" : "would delete"}  ${String(ageDays).padStart(4)}d  ${f.path}`);
}

if (!APPLY) {
  console.log(`\n  DRY RUN — nothing changed. Re-run with --apply to delete the ${toDelete.length} file(s) above.`);
  process.exit(0);
}

// ── 3. delete (in batches) ───────────────────────────────────────────────────
let removed = 0;
const paths = toDelete.map((f) => f.path);
for (let i = 0; i < paths.length; i += 100) {
  const batch = paths.slice(i, i + 100);
  const { error } = await supabase.storage.from(BUCKET).remove(batch);
  if (error) console.warn(`  ⚠ batch ${i}: ${error.message}`);
  else removed += batch.length;
}
console.log(`\n  Deleted ${removed}/${paths.length} orphaned file(s).`);
