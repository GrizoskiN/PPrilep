// ════════════════════════════════════════════════════════════════════════════
//  Diagnose (and optionally exercise) Facebook Page auto-posting.
//
//  Instagram already auto-posts with META_PAGE_ACCESS_TOKEN, so the token can
//  reach Meta. This script answers the only open question: why does the *Page*
//  path fail? It walks the exact same steps lib/social/meta.ts does and prints
//  Meta's real response at each one, so we stop guessing.
//
//  It checks, in order:
//    1. /debug_token   — what IS this token? type, scopes, expiry, which app.
//    2. /me/accounts   — is the token holder actually an admin of the Page,
//                        and does that Page grant pages_manage_posts?
//    3. /{PAGE_ID}?fields=access_token  — can we derive a Page token (the step
//                        postToFacebook depends on)?
//    4. (--post only) POST /{PAGE_ID}/feed — actually publish a test post.
//
//  DRY RUN by default: steps 1–3 only, nothing is published. Add --post to
//  publish a real (deletable) test post to the Page feed.
//
//  Reads FB_PAGE_ID + META_PAGE_ACCESS_TOKEN (+ IG_USER_ID) from .env.local.
//  Populate it first with:  vercel env pull .env.local
//
//  Run:
//    node scripts/fb-autopost-check.mjs           # diagnose only (safe)
//    node scripts/fb-autopost-check.mjs --post     # also publish a test post
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";

const GRAPH = "https://graph.facebook.com/v21.0";
const POST = process.argv.slice(2).includes("--post");

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const PAGE_ID = env.FB_PAGE_ID;
const TOKEN = env.META_PAGE_ACCESS_TOKEN;

if (!PAGE_ID || !TOKEN) {
  console.error("✗ Missing FB_PAGE_ID or META_PAGE_ACCESS_TOKEN in .env.local");
  console.error("  Run:  vercel env pull .env.local");
  process.exit(1);
}

const mask = (t) => (t ? `${t.slice(0, 8)}…${t.slice(-4)} (${t.length} chars)` : "(none)");

async function get(path, params = {}) {
  const qs = new URLSearchParams({ ...params, access_token: TOKEN }).toString();
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function fail(label, data) {
  const e = data?.error;
  console.error(`  ✗ ${label}: ${e?.message ?? JSON.stringify(data)}`);
  if (e) console.error(`     (code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""}, type ${e.type})`);
}

console.log(`\nFacebook auto-post check — Page ${PAGE_ID}`);
console.log(`Token: ${mask(TOKEN)}\n`);

// ── 1. What is this token? ──────────────────────────────────────────────────
console.log("1. Inspecting the token (/debug_token)…");
{
  const { ok, data } = await get("debug_token", { input_token: TOKEN });
  if (!ok) {
    fail("debug_token", data);
  } else {
    const d = data.data ?? {};
    const scopes = d.scopes ?? [];
    const expires = d.expires_at ? new Date(d.expires_at * 1000).toISOString() : "never / data access only";
    console.log(`   type:       ${d.type}`);
    console.log(`   app_id:     ${d.app_id}`);
    console.log(`   expires_at: ${d.data_access_expires_at || d.expires_at ? expires : "never"}`);
    console.log(`   valid:      ${d.is_valid}`);
    console.log(`   scopes:     ${scopes.join(", ") || "(none)"}`);
    const needed = ["pages_manage_posts", "pages_read_engagement", "pages_show_list"];
    const missing = needed.filter((s) => !scopes.includes(s));
    if (missing.length) {
      console.log(`   ⚠ MISSING for Page posting: ${missing.join(", ")}`);
      console.log(`     → This is almost certainly why FB fails. IG posting`);
      console.log(`       uses instagram_* scopes, which you evidently have,`);
      console.log(`       but the Page feed needs the pages_* scopes above.`);
    } else {
      console.log(`   ✓ All Page-posting scopes present.`);
    }
  }
}

// ── 2. Is the holder a Page admin, and what can it do there? ─────────────────
console.log("\n2. Checking Page admin rights (/me/accounts)…");
{
  const { ok, data } = await get("me/accounts", { fields: "id,name,tasks" });
  if (!ok) {
    fail("me/accounts", data);
    console.error("     (a System User token returns its assigned Pages here too;");
    console.error("      an empty list means the Page isn't assigned to it.)");
  } else {
    const pages = data.data ?? [];
    const mine = pages.find((p) => p.id === PAGE_ID);
    if (!mine) {
      console.log(`   ⚠ Page ${PAGE_ID} is NOT in this token's account list.`);
      console.log(`     Found: ${pages.map((p) => `${p.name} (${p.id})`).join(", ") || "none"}`);
      console.log(`     → The token holder isn't an admin of this Page (or the`);
      console.log(`       System User isn't assigned to it). Fix the assignment.`);
    } else {
      const tasks = mine.tasks ?? [];
      console.log(`   ✓ Found Page "${mine.name}" with tasks: ${tasks.join(", ")}`);
      if (!tasks.includes("CREATE_CONTENT")) {
        console.log(`   ⚠ Missing CREATE_CONTENT task → cannot publish posts.`);
      }
    }
  }
}

// ── 3. Can we derive a Page access token? (postToFacebook depends on this) ───
console.log("\n3. Deriving a Page access token (/{PAGE_ID}?fields=access_token)…");
let pageToken = null;
{
  const { ok, data } = await get(PAGE_ID, { fields: "access_token" });
  if (!ok || !data.access_token) {
    fail("page access_token", data);
    console.log("     → getPageAccessToken() in meta.ts would throw here.");
  } else {
    pageToken = data.access_token;
    console.log(`   ✓ Got Page token: ${mask(pageToken)}`);
  }
}

// ── 4. Actually post (opt-in). ──────────────────────────────────────────────
if (!POST) {
  console.log("\nDry run complete. Re-run with --post to publish a real test post.\n");
  process.exit(0);
}

if (!pageToken) {
  console.error("\n✗ Cannot post: no Page token was derived in step 3. Fix the above first.\n");
  process.exit(1);
}

console.log("\n4. Publishing a test post to the Page feed…");
{
  const message =
    "Тест објава од Мој Прилеп (автоматска). Може да се избрише. — " +
    new Date().toLocaleString("mk-MK");
  const res = await fetch(`${GRAPH}/${PAGE_ID}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: pageToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    fail("POST /feed", data);
    process.exit(1);
  }
  console.log(`   ✓ Posted! id: ${data.id}`);
  console.log(`     View: https://facebook.com/${data.id}`);
  console.log(`     Delete it from the Page if you don't want it public.\n`);
}
