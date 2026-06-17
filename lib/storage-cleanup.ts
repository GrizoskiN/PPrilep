import type { SupabaseClient } from "@supabase/supabase-js";

// ── Orphaned-file sweep for the `issue-photos` bucket ────────────────────────
//
// An orphan = a storage file no database row references (left by a deleted post
// or comment, a replaced photo, or an abandoned upload). Supabase Storage has no
// DB cascade, so these accumulate and eat the quota.
//
// Safety:
//   • References are gathered by scanning the FULL JSON of every row in REF_TABLES
//     for any "/issue-photos/<path>" — it can't miss a column.
//   • A file is deleted only if it is BOTH unreferenced AND older than
//     `olderThanDays` (default 7). That age floor is the grace window: it spares
//     in-flight uploads and gives a restore window (restore a post within the
//     week → its photos are referenced again, so they survive).
//
// Used by both the manual script (scripts/cleanup-orphans.mjs mirrors this) and
// the weekly Vercel cron route (app/api/cron/cleanup-orphans).

const BUCKET = "issue-photos";
// A superset is safe — extra tables only ever PROTECT files, never endanger them.
const REF_TABLES = [
  "issues",
  "issue_comments",
  "issue_change_requests",
  "profiles",
  "agency_posts",
  "komunalec_requests",
];

export interface SweepResult {
  referenced: number;
  inBucket: number;
  orphaned: number;
  deletable: number;
  deleted: number;
  bytesFreed: number;
  apply: boolean;
  olderThanDays: number;
  errors: string[];
}

interface BucketFile {
  path: string;
  createdAt: string | null;
  size: number;
}

async function collectReferenced(admin: SupabaseClient): Promise<Set<string>> {
  const re = new RegExp(`/${BUCKET}/([^"'?#\\\\\\s]+)`, "g");
  const referenced = new Set<string>();
  for (const table of REF_TABLES) {
    let from = 0;
    for (;;) {
      const { data, error } = await admin.from(table).select("*").range(from, from + 999);
      if (error || !data) break; // missing table / no access → skip (safe: nothing deleted because of it)
      for (const row of data) {
        const json = JSON.stringify(row);
        let m: RegExpExecArray | null;
        while ((m = re.exec(json)) !== null) {
          try {
            referenced.add(decodeURIComponent(m[1]));
          } catch {
            referenced.add(m[1]);
          }
        }
      }
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  return referenced;
}

async function listAll(admin: SupabaseClient, prefix: string): Promise<BucketFile[]> {
  const out: BucketFile[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !data) break;
    if (!data.length) break;
    for (const e of data) {
      const path = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) {
        out.push(...(await listAll(admin, path)));
      } else {
        const meta = e.metadata as { size?: number } | null;
        out.push({ path, createdAt: e.created_at ?? null, size: Number(meta?.size) || 0 });
      }
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

export async function sweepOrphans(
  admin: SupabaseClient,
  opts: { olderThanDays?: number; apply?: boolean } = {},
): Promise<SweepResult> {
  const olderThanDays = opts.olderThanDays ?? 7;
  const apply = opts.apply ?? false;
  const errors: string[] = [];

  const referenced = await collectReferenced(admin);
  const files = await listAll(admin, "");

  const now = Date.now();
  const cutoff = olderThanDays * 86_400_000;
  const ageOf = (f: BucketFile) =>
    f.createdAt ? now - new Date(f.createdAt).getTime() : Infinity;

  const orphans = files.filter((f) => !referenced.has(f.path));
  const toDelete = orphans.filter((f) => ageOf(f) >= cutoff);

  let deleted = 0;
  let bytesFreed = 0;
  if (apply && toDelete.length) {
    const paths = toDelete.map((f) => f.path);
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      const { error } = await admin.storage.from(BUCKET).remove(batch);
      if (error) {
        errors.push(`batch ${i}: ${error.message}`);
      } else {
        deleted += batch.length;
        for (const f of toDelete.slice(i, i + 100)) bytesFreed += f.size;
      }
    }
  }

  return {
    referenced: referenced.size,
    inBucket: files.length,
    orphaned: orphans.length,
    deletable: toDelete.length,
    deleted,
    bytesFreed,
    apply,
    olderThanDays,
    errors,
  };
}
