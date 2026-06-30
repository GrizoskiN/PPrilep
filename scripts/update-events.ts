/**
 * Update script — replaces placeholder city events with real, verified
 * happenings in Prilep (researched June 2026).
 *
 * For each target it finds an existing event by `matchTitles` and patches it
 * in place (so links/IDs survive); if none is found it creates a new one.
 *
 * Run:
 *   npx tsx scripts/update-events.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "81ctd9e6",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-10-01",
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

type EventFields = {
  title: string;
  category: string;
  startDate: string;
  endDate?: string;
  time?: string;
  location: string;
  description: string;
  sourceUrl?: string;
};

type Target = {
  // Titles of existing (placeholder) docs this real event should replace.
  matchTitles: string[];
  fields: EventFields;
};

const targets: Target[] = [
  // ── Pivofest 2026 (confirmed: 23rd edition, 17–19 July) ────────────────────
  {
    matchTitles: ["Прилеп Пиво Фест 2026", "Пивофест 2026 — 23. издание"],
    fields: {
      title: "Пивофест 2026 — 23. издание",
      category: "festival",
      startDate: "2026-07-17",
      endDate: "2026-07-19",
      time: "20:00",
      location: "Центар на градот, под Маркови Кули, Прилеп",
      description:
        "23-то издание на најпосетениот летен фестивал во Македонија, во центарот на градот под Маркови Кули. " +
        "Петок (17.07): „Bongas & Guitares“, Огнен Здравковски и Џенан Лончаревиќ. " +
        "Сабота (18.07): „Lockdown“, Јордан Митев и Милица Павловиќ. " +
        "Недела (19.07): Марјан Коцев, прилепскиот состав „The Hounds“ и Јелена Розга. " +
        "Покрај главната сцена, програма има и на Камената бина со домашни музичари, бендови и диџеи. " +
        "Прилепска скара и ладно пиво како заштитен знак.",
      sourceUrl:
        "https://muzika24.mk/festvali/pocnuva-odbrojuvanjeto-za-pivofest/74243/",
    },
  },

  // ── Прилеп Џез Викенд (recurring: last weekend of August) ──────────────────
  {
    matchTitles: [
      "Концерт: Прилепско Лето — Финале",
      "Прилеп Џез Викенд 2026",
    ],
    fields: {
      title: "Прилеп Џез Викенд 2026",
      category: "concert",
      startDate: "2026-08-28",
      endDate: "2026-08-30",
      time: "21:00",
      location: "Амфитеатар Варош, под Маркови Кули, Прилеп",
      description:
        "Традиционалниот џез викенд во Прилеп, кој се одржува последниот викенд во август во амбиентот под Маркови Кули. " +
        "Домашни и меѓународни џез изведувачи на отворено. Следете ја официјалната програма за точниот распоред и состави.",
      sourceUrl: "https://prilepjazz.mk/",
    },
  },

  // ── Поетски слем Македонија (recurring: Prilep, every October) ─────────────
  {
    matchTitles: ["Прилеп Џез Вечер", "Поетски слем Македонија 2026"],
    fields: {
      title: "Поетски слем Македонија 2026",
      category: "other",
      startDate: "2026-10-09",
      endDate: "2026-10-12",
      time: "20:30",
      location: "НУЦК „Марко Цепенков“, Прилеп",
      description:
        "Националната манифестација за слем-поезија, чиј традиционален домаќин е Прилеп секој октомври. " +
        "Промоции, изложби и поетско-музички перформанси, со финална вечер на натпреварот во НУЦК „Марко Цепенков“. " +
        "Точните датуми за 2026 допрва се потврдуваат — приближно 9–12 октомври.",
      sourceUrl:
        "https://nezavisen.mk/prilep-domakjin-na-15-poetski-slem-makedonija/",
    },
  },
];

async function run() {
  console.log(`Connecting to project ${client.config().projectId}…\n`);

  const existing = await client.fetch<{ _id: string; title: string }[]>(
    `*[_type == "cityEvent"]{ _id, title }`,
  );

  const tx = client.transaction();
  const log: string[] = [];

  for (const target of targets) {
    const match = existing.find((e) => target.matchTitles.includes(e.title));
    if (match) {
      tx.patch(match._id, (p) => p.set({ ...target.fields }));
      log.push(`   ✎ patched "${match.title}" → "${target.fields.title}"`);
    } else {
      tx.create({ _type: "cityEvent", ...target.fields });
      log.push(`   + created "${target.fields.title}"`);
    }
  }

  await tx.commit();

  console.log("✅  Done!");
  log.forEach((l) => console.log(l));
  console.log("\nRefresh /events (or /studio) to see the changes.");
}

run().catch((err) => {
  console.error("❌ Update failed:", err.message);
  process.exit(1);
});
