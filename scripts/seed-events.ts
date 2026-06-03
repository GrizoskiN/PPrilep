/**
 * Seed script — creates city events in Sanity.
 *
 * Prerequisites:
 *   1. Add SANITY_WRITE_TOKEN=sk... to .env.local
 *      (sanity.io/manage → project → API → Tokens → Editor)
 *   2. Run:
 *        npx tsx scripts/seed-events.ts
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

type EventDoc = {
  _type: string;
  title: string;
  category: string;
  startDate: string;
  endDate?: string;
  time?: string;
  location: string;
  description: string;
  sourceUrl?: string;
};

const events: EventDoc[] = [
  // ── Јуни ───────────────────────────────────────────────────────────────────
  {
    _type: "cityEvent",
    title: "Прилепско Културно Лето 2026",
    category: "festival",
    startDate: "2026-06-15",
    endDate: "2026-08-30",
    location: "Стара чаршија, Прилеп",
    description:
      "Два и пол месеци концерти, претстави и изложби на отворено низ старото градско јадро. Слободен влез за сите настани.",
  },
  {
    _type: "cityEvent",
    title: "Изложба: Тутунот и Прилеп",
    category: "exhibition",
    startDate: "2026-06-03",
    endDate: "2026-06-28",
    location: "Завод и Музеј Прилеп",
    description:
      "Фотографии, документи и предмети од богатата тутунска историја на градот. Влез слободен.",
  },
  {
    _type: "cityEvent",
    title: "Театарска вечер: Чекајќи го Годо",
    category: "theatre",
    startDate: "2026-06-06",
    time: "20:00",
    location: "Народен театар Прилеп",
    description:
      "Класичното дело на Семјуел Бекет во режија на домашниот ансамбл. Резервирајте билети однапред.",
    sourceUrl: "https://www.facebook.com",
  },
  {
    _type: "cityEvent",
    title: "Детска Мисија — Игра и Учење",
    category: "family",
    startDate: "2026-06-14",
    time: "11:00",
    location: "Дом на Културата Марко Цепенков",
    description:
      "Работилници, интерактивни игри и мини претстави за деца од 4 до 12 години. Бесплатно за деца.",
  },
  {
    _type: "cityEvent",
    title: "Велоче — Железна Порта Мариово",
    category: "sport",
    startDate: "2026-05-30",
    endDate: "2026-05-31",
    time: "10:00",
    location: "Манасти Св. Илија, с. Мелница — Мариово",
    description:
      "8-ми по ред велосипедски настан организиран од ВелоЧе. Две велосипедски тури: Мала и Голема. Трасата минува низ Трибор, Железна Порта, Мелница. Прилепска Јавнија и Крали Марко пиво — бесплатно за учесниците.",
    sourceUrl: "https://www.facebook.com/veloche",
  },
  {
    _type: "cityEvent",
    title: "Велоче Урбано — Ноќна Вожња",
    category: "sport",
    startDate: "2026-06-26",
    time: "21:00",
    location: "Плоштад Методија Андонов-Ченто, Прилеп",
    description:
      "Ноќна рекреативна вожња низ улиците на Прилеп. Без возрасни ограничувања, сите велосипеди добредојдени.",
    sourceUrl: "https://www.facebook.com/veloche",
  },

  // ── Јули ───────────────────────────────────────────────────────────────────
  {
    _type: "cityEvent",
    title: "Прилеп Пиво Фест 2026",
    category: "festival",
    startDate: "2026-07-03",
    endDate: "2026-07-05",
    time: "18:00",
    location: "Градски Парк, Прилеп",
    description:
      "Три вечери занаетчиско пиво, улична храна и музика во живо во срцето на градот. Настапи на локални и регионални бендови секоја вечер.",
  },
  {
    _type: "cityEvent",
    title: "Прилеп Рок Фест",
    category: "concert",
    startDate: "2026-07-18",
    time: "21:00",
    location: "Безистен, Прилеп",
    description:
      "Локални и регионални рок бендови на една сцена. Влезот е слободен. Пред настапите — изложба на гитари.",
  },
  {
    _type: "cityEvent",
    title: "Летна Кино Ноќ",
    category: "other",
    startDate: "2026-07-10",
    time: "21:30",
    location: "Дворот на Завод и Музеј Прилеп",
    description:
      "Проекција на класичен македонски филм под отворено небо. Носете си ќебе и добро расположение. Бесплатен влез.",
  },
  {
    _type: "cityEvent",
    title: "Детски Ликовен Маратон",
    category: "family",
    startDate: "2026-07-25",
    time: "10:00",
    location: "Плоштад Методија Андонов-Ченто, Прилеп",
    description:
      "Деца од целиот град цртаат и сликаат на отворено. Материјалите се обезбедени. За деца до 15 год.",
  },

  // ── Август ─────────────────────────────────────────────────────────────────
  {
    _type: "cityEvent",
    title: "Маркови Кули Трекинг — Летна Верзија",
    category: "sport",
    startDate: "2026-08-08",
    time: "07:00",
    location: "Паркинг Маркови Кули, Прилеп",
    description:
      "Организирана планинарска тура до Маркови Кули со водич. Препорачана опрема: планинарски чевли, вода (2л), сончева заштита. Пријавување задолжително.",
  },
  {
    _type: "cityEvent",
    title: "Концерт: Прилепско Лето — Финале",
    category: "concert",
    startDate: "2026-08-29",
    time: "21:00",
    location: "Отворена сцена, Стара чаршија",
    description:
      "Завршен гала концерт на Прилепско Културно Лето 2026. Изненадувачки гости и прожектори над Маркови Кули.",
  },

  // ── Септември ──────────────────────────────────────────────────────────────
  {
    _type: "cityEvent",
    title: "Маратон на Прилеп 2026",
    category: "sport",
    startDate: "2026-09-12",
    time: "09:00",
    location: "Плоштад Методија Андонов-Ченто, Прилеп",
    description:
      "Трки на 5 км, 10 км и полумаратон (21 км) низ улиците на Прилеп. Пријавувањето е отворено. Медали за сите финишери.",
    sourceUrl: "https://www.facebook.com",
  },
  {
    _type: "cityEvent",
    title: "Есенски Занаетчиски Пазар",
    category: "other",
    startDate: "2026-09-19",
    endDate: "2026-09-20",
    time: "10:00",
    location: "Безистен, Прилеп",
    description:
      "Рачно изработени производи, локален мед, сирење, текстил и керамика. Поддржи ги локалните занаетчии.",
  },
  {
    _type: "cityEvent",
    title: "Театар за Деца: Снежана",
    category: "theatre",
    startDate: "2026-09-27",
    time: "11:00",
    location: "Народен театар Прилеп",
    description:
      "Прекрасна претстава за деца со маски, музика и магија. Препорачано за деца од 4 до 10 год. Купи билет однапред.",
  },

  // ── Октомври ───────────────────────────────────────────────────────────────
  {
    _type: "cityEvent",
    title: "Ноќ на Музеите — Прилеп",
    category: "exhibition",
    startDate: "2026-10-03",
    time: "19:00",
    location: "Завод и Музеј Прилеп",
    description:
      "Посебна ноќна посета на постојаните и привремените поставки. Водени тури на секој час. Бесплатен влез.",
  },
  {
    _type: "cityEvent",
    title: "Прилеп Џез Вечер",
    category: "concert",
    startDate: "2026-10-16",
    time: "20:30",
    location: "Дом на Армијата, Прилеп",
    description:
      "Квартет и специјален гостин од Скопје. Концерт во затворен простор — ограничен број места. Резервирај навреме.",
  },
];

async function seed() {
  console.log(`Connecting to project ${client.config().projectId}…\n`);

  // Check for existing events so the script is safe to re-run
  const existing = await client.fetch<{ _id: string; title: string }[]>(
    `*[_type == "cityEvent"]{ _id, title }`,
  );

  if (existing.length > 0) {
    console.log(
      `⚠️  Found ${existing.length} existing event(s). Skipping duplicates by title.\n`,
    );
  }

  const existingTitles = new Set(existing.map((e) => e.title));
  const toCreate = events.filter((e) => !existingTitles.has(e.title));

  if (toCreate.length === 0) {
    console.log("✅  All events already exist. Nothing to do.");
    return;
  }

  console.log(`Creating ${toCreate.length} event(s)…\n`);

  const transaction = client.transaction();
  for (const ev of toCreate) {
    transaction.create(ev);
  }

  await transaction.commit();

  console.log("✅  Done! Created events:");
  toCreate.forEach((e) => console.log(`   • ${e.title} (${e.startDate})`));
  console.log("\nRefresh /studio to see them.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
