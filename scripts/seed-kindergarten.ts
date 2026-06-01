/**
 * Seed script — Kindergarten Наша Иднина
 *
 * Creates:
 *   • 4 institution documents
 *   • 1 weekly menu (18.05 – 29.05.2026, shared across all institutions)
 *
 * Run once:
 *   npx tsx scripts/seed-kindergarten.ts
 */

import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf-8");
  raw.split("\n").forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) {
      const val = rest.join("=").trim();
      if (!process.env[key.trim()]) process.env[key.trim()] = val;
    }
  });
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "81ctd9e6",
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET    ?? "production",
  apiVersion: "2024-10-01",
  token:     process.env.SANITY_WRITE_TOKEN,
  useCdn:    false,
});

// ── Institutions ─────────────────────────────────────────────────────────────

const INSTITUTIONS = [
  {
    _id:  "institution-bonchejca",
    _type: "institution",
    name:  "Градинка Наша Иднина - Бончејца",
    slug:  { _type: "slug", current: "bonchejca" },
    address:     "Киро Нацески-Феток 1",
    phone:       "048 424 076",
    closingTime: "18:00",
    district:    "Бончејца",
  },
  {
    _id:  "institution-mirche-acev",
    _type: "institution",
    name:  "Градинка Наша Иднина - Мирче Ацев",
    slug:  { _type: "slug", current: "mirche-acev" },
    address:     null,
    phone:       "048 421 996",
    closingTime: "17:00",
    district:    "Центар",
  },
  {
    _id:  "institution-trizla",
    _type: "institution",
    name:  "Градинка Наша Иднина - Тризла",
    slug:  { _type: "slug", current: "trizla" },
    address:     null,
    phone:       "075 235 689",
    closingTime: "18:00",
    district:    "Тризла",
  },
  {
    _id:  "institution-rabotnicki",
    _type: "institution",
    name:  "Градинка Наша Иднина - Работнички",
    slug:  { _type: "slug", current: "rabotnicki" },
    address:     null,
    phone:       null,
    closingTime: "18:00",
    district:    "Работнички",
  },
];

// ── Weekly menu (18.05 – 29.05.2026) ─────────────────────────────────────────
// Source: official menu image, applies to all 4 institutions

const WEEKLY_MENU = {
  _id:   "menu-2026-05-18",
  _type: "menuPost",
  title: "Мени 18.05 - 29.05.2026",
  weekStart: "2026-05-18",
  weekEnd:   "2026-05-29",
  // No institution field — applies to all

  monday: {
    breakfast: "Леб со мармалад и чај",
    snack1:    "Тортица чак со мед",
    lunch:     "Грав",
    snack2:    "Зелка",
  },
  tuesday: {
    breakfast: "Леб со путер, јајце и сирење",
    snack1:    "Овошен јогурт, чај со мед",
    lunch:     "Гулаш со макарони и супа",
    snack2:    null,
  },
  wednesday: {
    breakfast: "Макарони со урда и јогурт",
    snack1:    "Интегрални бисквити, чај со мед",
    lunch:     "Растурена сарма",
    snack2:    null,
  },
  thursday: {
    breakfast: "Листнато со полнеж, изварка и чај",
    snack1:    "Житарка, овошен сок",
    lunch:     "Компир манџа",
    snack2:    "Зелка, морков",
  },
  friday: {
    breakfast: "Бисквити со млеко",
    snack1:    "Чоколадна бисквита, овошен сок",
    lunch:     "Ориз со пилешки стек и супа",
    snack2:    null,
  },
};

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding Sanity — Наша Иднина kindergartens...\n");

  // Create/replace institutions
  for (const inst of INSTITUTIONS) {
    const doc = Object.fromEntries(
      Object.entries(inst).filter(([, v]) => v !== null),
    );
    await client.createOrReplace(doc as Parameters<typeof client.createOrReplace>[0]);
    console.log(`  ✓ ${inst.name}`);
  }

  // Create/replace weekly menu
  await client.createOrReplace(WEEKLY_MENU as Parameters<typeof client.createOrReplace>[0]);
  console.log(`  ✓ Menu: ${WEEKLY_MENU.title}`);

  console.log("\nDone!");
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
