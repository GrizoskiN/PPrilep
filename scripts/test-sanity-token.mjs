/**
 * Isolated Sanity token test — bypasses Next.js entirely.
 *
 * Run with:
 *   node --env-file=.env.local scripts/test-sanity-token.mjs
 *
 * It will:
 *   1. Show which token identity Sanity sees
 *   2. Attempt to create a throwaway document
 *   3. Tell you exactly whether this token can write content
 */

const PID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const TOKEN = process.env.SANITY_WRITE_TOKEN;

console.log("──────────────────────────────────────────");
console.log("Project ID :", PID);
console.log("Dataset    :", DATASET);
console.log("Token set  :", TOKEN ? `yes (prefix ${TOKEN.slice(0, 10)}…, length ${TOKEN.length})` : "NO ❌");
console.log("──────────────────────────────────────────");

if (!TOKEN) {
  console.log("\n❌ SANITY_WRITE_TOKEN is not set in .env.local — stop here.\n");
  process.exit(1);
}

// 1. Who is this token?
try {
  const meRes = await fetch(`https://${PID}.api.sanity.io/v2021-06-07/users/me`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const me = await meRes.json();
  console.log("\n[whoami]", JSON.stringify(me, null, 2));
} catch (e) {
  console.log("\n[whoami] failed:", e.message);
}

// 2. Can it READ?
console.log("\n[read] attempting a query…");
try {
  const readRes = await fetch(
    `https://${PID}.api.sanity.io/v2024-01-01/data/query/${DATASET}?query=${encodeURIComponent('count(*[_type=="post"])')}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  if (readRes.ok) {
    const data = await readRes.json();
    console.log(`✅ READ OK — ${data.result} post(s) visible to this token.`);
  } else {
    const err = await readRes.json();
    console.log(`❌ READ DENIED (HTTP ${readRes.status}):`, err.error?.description ?? JSON.stringify(err));
  }
} catch (e) {
  console.log("[read] network error:", e.message);
}

// 3. Try to create a document
console.log("\n[create] attempting to create a throwaway post…");
try {
  const res = await fetch(
    `https://${PID}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mutations: [
          { create: { _type: "post", title: "TOKEN TEST — safe to delete" } },
        ],
      }),
    },
  );

  if (res.ok) {
    const data = await res.json();
    console.log("\n✅✅✅ CREATE SUCCEEDED. This token CAN write content.");
    console.log("Created doc id:", data.results?.[0]?.id);
    console.log("→ The problem was elsewhere. Delete this test doc in Studio.\n");
  } else {
    const err = await res.json();
    console.log(`\n❌ CREATE DENIED (HTTP ${res.status})`);
    console.log("Reason:", err.error?.description ?? JSON.stringify(err));
    console.log("\n→ This token does NOT have content-create permission.");
    console.log("→ It is the WRONG token (likely Access Manager / Seed).");
    console.log("→ Create a fresh **Editor** token and replace SANITY_WRITE_TOKEN.\n");
  }
} catch (e) {
  console.log("\n[create] network error:", e.message);
}
