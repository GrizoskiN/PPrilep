// ════════════════════════════════════════════════════════════════════════════
//  One-time backfill: raise the Cache-Control TTL on EXISTING storage objects.
//
//  Why: our uploads used to set a 1-hour cache TTL (the Supabase default). Every
//  browser/CDN therefore re-fetched each image hourly, and those repeat fetches
//  are what filled the Free-plan "cached egress" quota (9 GB over a 5 GB cap)
//  even though the files themselves total only ~50 MB. New uploads now use a
//  1-year TTL; this script fixes the back-catalogue.
//
//  Filenames are unique + immutable (timestamps / UUIDs), so a long cache is
//  safe: a changed image is always a new path, never the same URL with new bytes.
//
//  How: supabase-js has no metadata-only update, so for each object we download
//  it once and re-upload to the SAME path with `upsert:true` + the new
//  cacheControl. The public URL is unchanged. Total download is tiny (~50 MB).
//
//  Run:   node scripts/recache-storage.mjs           (all buckets below)
//         node scripts/recache-storage.mjs issue-photos   (one bucket)
//
//  Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
//  The service-role key bypasses RLS so it sees every object. Idempotent — safe
//  to re-run.
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── load .env.local (falls back to real env vars, e.g. in CI) ────────────────
const env = {};
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // no .env.local — rely on process.env
}
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env vars in .env.local");

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CACHE_CONTROL = "31536000"; // 1 year
const BUCKETS = ["issue-photos", "avatars", "initiative-images", "partner-logos"];
const PAGE = 100;

/** List every object path under a bucket, recursing into folders. */
async function listAll(bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // A storage "folder" comes back as a row with no `id` (no metadata).
      if (entry.id === null || entry.id === undefined) {
        out.push(...(await listAll(bucket, path)));
      } else {
        out.push({ path, contentType: entry.metadata?.mimetype });
      }
    }
    if (data.length < PAGE) break;
  }
  return out;
}

async function recacheBucket(bucket) {
  process.stdout.write(`\n${bucket}: listing… `);
  let objects;
  try {
    objects = await listAll(bucket);
  } catch (e) {
    console.log(`skipped (${e.message})`);
    return { ok: 0, fail: 0 };
  }
  console.log(`${objects.length} objects`);

  let ok = 0;
  let fail = 0;
  for (const { path, contentType } of objects) {
    const dl = await supabase.storage.from(bucket).download(path);
    if (dl.error || !dl.data) {
      console.warn(`  ✗ download ${path}: ${dl.error?.message ?? "no data"}`);
      fail++;
      continue;
    }
    const buf = Buffer.from(await dl.data.arrayBuffer());
    const up = await supabase.storage.from(bucket).upload(path, buf, {
      contentType: contentType || dl.data.type || "application/octet-stream",
      cacheControl: CACHE_CONTROL,
      upsert: true,
    });
    if (up.error) {
      console.warn(`  ✗ upload ${path}: ${up.error.message}`);
      fail++;
    } else {
      ok++;
      if (ok % 25 === 0) process.stdout.write(`  …${ok} done\n`);
    }
  }
  console.log(`  ${bucket}: ${ok} re-cached, ${fail} failed`);
  return { ok, fail };
}

const only = process.argv[2];
const targets = only ? [only] : BUCKETS;
let totalOk = 0;
let totalFail = 0;
for (const bucket of targets) {
  const r = await recacheBucket(bucket);
  totalOk += r.ok;
  totalFail += r.fail;
}
console.log(`\nDone. ${totalOk} objects re-cached with max-age=${CACHE_CONTROL}, ${totalFail} failed.`);
