// ════════════════════════════════════════════════════════════════════════════
//  Ingest ЕВН / Електродистрибуција power-outage notices for КЕЦ Прилеп and
//  publish them as EVN agency posts (the "⚡ Струја" utility page + home feed).
//
//  Source: the same public JSON the official live outages map uses —
//    https://portal-api.elektrodistribucija.mk/DSO/Prekini/ZemiPrekini
//  It returns every outage nationwide; each row carries a `kecId` (Прилеп = 14)
//  and a stable `prekinID` (GUID) we use to de-duplicate.
//
//  Each outage becomes one row in `agency_posts` (agency_id = 'evn'):
//    • title    "⚡ Планиран прекин — <нас.место>"
//    • body     location list + voltage level + human from–till line
//    • starts_at = null, ends_at = kraj  → visible immediately (so a planned
//      outage is an ADVANCE warning, not shown only once it has begun) and
//      auto-hides once the outage is over (no manual cleanup). The exact
//      from–till is in the body text.
//    • source_ref = hash(kecId|place|location|start|end)  → dedup: re-running
//      never double-posts. (The feed's own `prekinID` is randomised on every
//      request, so it is useless as a key — a content hash is stable instead.)
//
//  We insert directly with the service-role key (NOT create_agency_post), so we
//  DON'T fan a push notification out to every user for every village outage.
//
//  Requires a `source_ref` column on agency_posts (see
//  supabase/add_agency_post_source_ref.sql) with a unique (agency_id, source_ref).
//
//  Run:  node scripts/ingest-evn-outages.mjs            (DRY RUN — prints only)
//        node scripts/ingest-evn-outages.mjs --commit   (writes to Supabase)
//
//  Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const KEC_PRILEP = 14;
const SERVICE_URL = "https://portal-api.elektrodistribucija.mk/DSO/Prekini/ZemiPrekini";
const AGENCY_ID = "evn";
const COMMIT = process.argv.includes("--commit");

// ── load .env.local (falls back to process.env in CI) ────────────────────────
const env = {};
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — rely on process.env */
}
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── helpers ──────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
/** Format an ISO timestamp as "DD.MM.YYYY HH:mm" (as the official map shows). */
function human(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Stable dedup key from the outage's content (the API's prekinID is random). */
function sourceRef(o) {
  const raw = [o.kecId, o.nasMesto, o.adresa, o.pocetok, o.kraj].join("|");
  return "evn:" + createHash("sha1").update(raw).digest("hex").slice(0, 16);
}

/** Map one raw outage record → an agency_posts row. */
function toPost(o) {
  const type = (o.tipPrekin || "Прекин").trim();
  const place = (o.nasMesto || "").trim();
  const lines = [];
  if (o.adresa) lines.push(`📍 Локација: ${o.adresa.trim()}`);
  if (o.napNivo) lines.push(`🔌 Напонско ниво: ${o.napNivo.trim()}`);
  lines.push(`🕐 Од ${human(o.pocetok)} до ${human(o.kraj)}`);
  return {
    agency_id: AGENCY_ID,
    title: `⚡ ${type}${place ? ` — ${place}` : ""}`,
    body: lines.join("\n"),
    audience: "all",
    is_red_alert: type.toLowerCase().includes("итен"), // emergency outages → red
    starts_at: null, // visible now — a planned outage is an advance warning
    ends_at: new Date(o.kraj).toISOString(), // auto-hide once the outage is over
    source_ref: sourceRef(o),
  };
}

// ── run ──────────────────────────────────────────────────────────────────────
const res = await fetch(SERVICE_URL, { headers: { Accept: "application/json" } });
if (!res.ok) throw new Error(`Source API ${res.status}`);
const all = await res.json();
const prilep = all.filter((o) => Number(o.kecId) === KEC_PRILEP);

// Only outages that haven't already ended.
const now = Date.now();
const active = prilep.filter((o) => new Date(o.kraj).getTime() > now);
const posts = active.map(toPost);

console.log(`\nКЕЦ Прилеп: ${prilep.length} outage(s) in feed, ${posts.length} still active.\n`);
for (const p of posts) {
  console.log("──────────────────────────────────────────────");
  console.log(p.title);
  console.log(p.body);
  console.log(`   window: ${p.starts_at} → ${p.ends_at}`);
  console.log(`   source_ref: ${p.source_ref}${p.is_red_alert ? "   [RED ALERT]" : ""}`);
}
console.log("──────────────────────────────────────────────\n");

if (!COMMIT) {
  console.log("DRY RUN — nothing written. Re-run with --commit to publish.\n");
  process.exit(0);
}

if (!url || !key) throw new Error("Missing Supabase env vars in .env.local");
const supabase = createClient(url, key, { auth: { persistSession: false } });

// Which of these outages are already posted? (dedup on our stable content hash)
// PostgREST can't upsert onto a *partial* unique index, so we diff by hand:
// insert the outages we haven't seen, refresh the window/text of ones we have.
const refs = posts.map((p) => p.source_ref);
const { data: existing, error: selErr } = await supabase
  .from("agency_posts")
  .select("id, source_ref")
  .eq("agency_id", AGENCY_ID)
  .in("source_ref", refs);
if (selErr) throw selErr;

const seen = new Map((existing ?? []).map((r) => [r.source_ref, r.id]));
const toInsert = posts.filter((p) => !seen.has(p.source_ref));
const toUpdate = posts.filter((p) => seen.has(p.source_ref));

if (toInsert.length) {
  const { error } = await supabase.from("agency_posts").insert(toInsert);
  if (error) throw error;
}
for (const p of toUpdate) {
  const { error } = await supabase
    .from("agency_posts")
    .update({ title: p.title, body: p.body, starts_at: p.starts_at, ends_at: p.ends_at })
    .eq("id", seen.get(p.source_ref));
  if (error) throw error;
}
console.log(`Inserted ${toInsert.length}, refreshed ${toUpdate.length} EVN outage post(s).\n`);
