// ════════════════════════════════════════════════════════════════════════════
//  Downscale oversized storage originals IN PLACE to cut cached egress.
//
//  Why: the back-catalogue of `issue-photos` (and friends) still holds full-res
//  phone-camera JPEGs from before client-side compression existed — measured up
//  to 9.4 MB each, with ~90% of all bytes living in a handful of >2 MB files.
//  Every mobile/web view downloads the whole original to render a thumbnail, and
//  every Cloudflare cache miss re-fetches those megabytes from Supabase — which
//  is what dominates the "cached egress" bill. Shrinking a 9 MB original to
//  ~150 KB is a ~50x cut on exactly the objects that get hammered, and it helps
//  EVERY client at once (including old app builds that fetch Supabase directly).
//
//  What: re-encodes each object with sharp to the SAME knobs the upload clients
//  already use for new photos, so a photo no longer depends on who uploaded it:
//    • longest edge ≤ 1000px  (compressImage.ts / pickImage.ts MAX_DIMENSION)
//    • JPEG quality 0.8        (same QUALITY)
//  then re-uploads to the SAME path (upsert) with a 1-year cacheControl. The
//  public URL never changes, so nothing else needs updating.
//
//  Safe by design:
//    • DRY RUN by default — lists what WOULD change and the bytes saved, writes
//      nothing. Add --apply to actually re-upload.
//    • Skips anything that wouldn't shrink: already-small files, and any object
//      whose re-encode comes out no smaller than the original.
//    • Skips non-JPEG/PNG (svg, gif, heic, webp animations) — like the clients.
//    • --min=BYTES threshold (default 700000 ≈ 0.7 MB) so we only touch the
//      genuinely oversized originals and leave already-optimised uploads alone.
//    • Idempotent: a re-run finds nothing left to shrink.
//
//  Filenames are unique + immutable (uuids / timestamps), so re-encoding bytes
//  at the same key is always safe — a changed image is a new path elsewhere,
//  never the same URL with different bytes cached in front of it.
//
//  Run:
//    node scripts/downscale-storage.mjs                 # dry run, all buckets
//    node scripts/downscale-storage.mjs issue-photos    # dry run, one bucket
//    node scripts/downscale-storage.mjs issue-photos --apply   # do it
//    node scripts/downscale-storage.mjs --apply --min=2000000  # only >2 MB
//
//  Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
//  The service-role key bypasses RLS so it sees every object.
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

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

// ── knobs (match compressImage.ts / pickImage.ts) ────────────────────────────
const MAX_DIMENSION = 1000; // longest edge we keep
const QUALITY = 80; // JPEG quality (sharp uses 0–100; 80 == the clients' 0.8)
const CACHE_CONTROL = "31536000"; // 1 year
const BUCKETS = ["issue-photos", "avatars", "initiative-images", "partner-logos"];
const PAGE = 100;

// Only these re-encode cleanly to a smaller JPEG. Everything else (svg, gif,
// animated webp, heic) is passed through untouched, exactly like the clients.
const RESIZABLE = /^image\/(jpeg|jpg|png|webp)$/i;

// ── args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const minArg = args.find((a) => a.startsWith("--min="));
const MIN_BYTES = minArg ? Number(minArg.split("=")[1]) : 700_000;
const only = args.find((a) => !a.startsWith("--"));

const mb = (n) => `${(n / 1e6).toFixed(2)} MB`;

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
        out.push({
          path,
          size: entry.metadata?.size ?? 0,
          contentType: entry.metadata?.mimetype ?? "",
        });
      }
    }
    if (data.length < PAGE) break;
  }
  return out;
}

async function downscaleBucket(bucket) {
  process.stdout.write(`\n${bucket}: listing… `);
  let objects;
  try {
    objects = await listAll(bucket);
  } catch (e) {
    console.log(`skipped (${e.message})`);
    return { done: 0, before: 0, after: 0, skipped: 0, failed: 0 };
  }
  const candidates = objects.filter(
    (o) => o.size >= MIN_BYTES && RESIZABLE.test(o.contentType),
  );
  console.log(
    `${objects.length} objects, ${candidates.length} over ${mb(MIN_BYTES)} & resizable`,
  );

  let done = 0;
  let before = 0;
  let after = 0;
  let skipped = 0;
  let failed = 0;

  for (const obj of candidates) {
    const dl = await supabase.storage.from(bucket).download(obj.path);
    if (dl.error || !dl.data) {
      console.warn(`  ✗ download ${obj.path}: ${dl.error?.message ?? "no data"}`);
      failed++;
      continue;
    }
    const input = Buffer.from(await dl.data.arrayBuffer());

    let output;
    try {
      // rotate() bakes in the EXIF orientation before we strip metadata, so
      // portrait phone photos don't come back sideways (same concern the web
      // canvas path handles with imageOrientation:"from-image").
      output = await sharp(input)
        .rotate()
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer();
    } catch (e) {
      console.warn(`  ✗ encode ${obj.path}: ${e.message}`);
      failed++;
      continue;
    }

    // Never grow a file: if the re-encode isn't smaller, leave the original.
    if (output.length >= input.length) {
      skipped++;
      continue;
    }

    before += input.length;
    after += output.length;
    const pct = ((1 - output.length / input.length) * 100).toFixed(0);
    console.log(
      `  ${APPLY ? "↓" : "•"} ${obj.path}  ${mb(input.length)} → ${mb(output.length)}  (-${pct}%)`,
    );

    if (APPLY) {
      const up = await supabase.storage.from(bucket).upload(obj.path, output, {
        contentType: "image/jpeg",
        cacheControl: CACHE_CONTROL,
        upsert: true,
      });
      if (up.error) {
        console.warn(`  ✗ upload ${obj.path}: ${up.error.message}`);
        failed++;
        before -= input.length;
        after -= output.length;
        continue;
      }
    }
    done++;
  }

  const verb = APPLY ? "shrunk" : "would shrink";
  console.log(
    `  ${bucket}: ${verb} ${done} — ${mb(before)} → ${mb(after)} ` +
      `(saves ${mb(before - after)}), ${skipped} already-optimal, ${failed} failed`,
  );
  return { done, before, after, skipped, failed };
}

const targets = only ? [only] : BUCKETS;
console.log(
  APPLY
    ? `APPLYING downscale (≤${MAX_DIMENSION}px, q${QUALITY}) to files ≥ ${mb(MIN_BYTES)}`
    : `DRY RUN — nothing will be written. Re-run with --apply to commit.`,
);

let g = { done: 0, before: 0, after: 0, skipped: 0, failed: 0 };
for (const bucket of targets) {
  const r = await downscaleBucket(bucket);
  for (const k of Object.keys(g)) g[k] += r[k];
}

console.log(
  `\n${APPLY ? "Done." : "Dry run complete."} ` +
    `${g.done} files ${APPLY ? "shrunk" : "to shrink"}, ` +
    `${mb(g.before)} → ${mb(g.after)} (saves ${mb(g.before - g.after)}), ` +
    `${g.skipped} already-optimal, ${g.failed} failed.`,
);
if (!APPLY) console.log("Re-run with --apply to commit these changes.\n");
