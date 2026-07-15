// ── Возен ред (departure timetables) ─────────────────────────────────────────
// Official operator timetable, keyed by route id → stop id (ids from
// busRoutes.ts). Each stop lists its departure times per direction; the stop
// panel on the map renders these and highlights the next departure.
//
// Source: ЈП за ПУП timetables (July 2026). Where the sheet's stop names differ
// from ours they were matched by sequence between their neighbours; "спроти /
// наспроти X" (across the street from X) maps to the same stop as X. Notable
// aliases: Реклами → Комерцијална банка (same stop),
// Ст. Општина → Фурна Плетварец, Табана → Бела Зграда Табана,
// спроти Дени Мебел → Завод за Здравство, Стерна → Болница Кружен тек,
// Футура суд → Футура Маркет,
// Палмашоп (L2) → Мое Пазарче, Пошта Точила → ООУ Блаже Конески,
// спроти Орде Чопела → Интернат, Футура рид → Ул. Мирче Ацев Центропромет,
// под Суд/под Липа → Хотел Липа, Д.Наредникот → Симпо, Макам → Хотел Сонце,
// Др. Савески → Форд Сервис, 11 Окт. → Ф-ка 11ти Октомври, Лав → Дониа,
// Маслинкара → Центропромет Магацини, Микрон → Васидора, Д.Бањарот → Жабино
// Маало, 5та Прилепска 2 → 5та Прилепска Згради.
// "5та Прилепска 2/3" are one physical stop (5та Прилепска Згради) — the
// earlier time (07:24…) is used. Rows with no matching map stop, kept
// commented until a stop exists: L1 "Автоконтрол" (06:54…14:54),
// L1 "Венеција" (07:03…15:03).

import { BUS_STOPS } from "./busRoutes";

export interface StopSchedule {
  direction: string; // "→ Н. Гробишта" — where this departure is headed
  times: string[]; // "HH:MM", chronological
}

// Grace window: a departure counts as "next" until this many minutes AFTER its
// scheduled time. Keeps a bus that's a few minutes ahead/behind from making the
// panel jump to the following hour (e.g. at 12:40 the 12:39 run still shows).
export const GRACE_MIN = 10;

// Minutes-since-midnight for a "HH:MM" string.
export const hhmmToMin = (t: string) =>
  Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

const DIR_GROBISTA = "→ Н. Гробишта";
const DIR_SALIDA = "→ Хотел Салида";
const DIR_RID = "→ Рид";
const DIR_FAKULTET = "→ Факултет";
const DIR_AMFORA = "→ Амфора";
const DIR_AMSM = "→ АМСМ";

// Lines 2 and 3 run strictly hourly, so their columns are generated: `count`
// departures starting at `first`, one every hour ("06:35" × 14 → …"19:35").
const hourly = (first: string, count: number): string[] => {
  const h0 = Number(first.slice(0, 2));
  const mm = first.slice(3);
  return Array.from(
    { length: count },
    (_, i) => `${String(h0 + i).padStart(2, "0")}:${mm}`,
  );
};

// prettier-ignore
const LINE1: Record<string, StopSchedule[]> = {
  "hotelsalida": [
    { direction: DIR_GROBISTA, times: ["06:30", "07:30", "08:30", "09:30", "10:40", "12:00", "13:30", "14:30", "15:30", "16:30", "17:30", "18:30", "19:30"] },
  ],
  "rampo levkata": [
    { direction: DIR_GROBISTA, times: ["06:31", "07:31", "08:31", "09:31", "10:41", "12:01", "13:31", "14:31", "15:31", "16:31", "17:31", "18:31", "19:31"] },
    { direction: DIR_SALIDA, times: ["07:27", "08:27", "09:27", "10:35", "11:55", "13:25", "14:27", "15:27", "16:25", "17:25", "18:25", "19:25"] },
  ],
  "maticno": [
    { direction: DIR_GROBISTA, times: ["06:32", "07:32", "08:32", "09:32", "10:42", "12:02", "13:32", "14:32", "15:32", "16:32", "17:32", "18:32", "19:32"] },
    { direction: DIR_SALIDA, times: ["07:26", "08:26", "09:26", "10:34", "11:54", "13:24", "14:26", "15:26", "16:24", "17:24", "18:24", "19:24"] },
  ],
  "teatar": [
    { direction: DIR_GROBISTA, times: ["06:34", "07:34", "08:34", "09:34", "10:45", "12:05", "13:34", "14:34", "15:34", "16:34", "17:34", "18:34", "19:34"] },
    { direction: DIR_SALIDA, times: ["07:24", "08:24", "09:24", "10:32", "11:52", "13:22", "14:24", "15:24", "16:22", "17:22", "18:22", "19:22"] },
  ],
  // Not a named row in the operator sheet; sits between Театар and Болница on
  // the line (~1 min apart), so its times are interpolated from those neighbours.
  "gradski stadion": [
    { direction: DIR_GROBISTA, times: ["06:35", "07:35", "08:35", "09:35", "10:46", "12:06", "13:35", "14:35", "15:35", "16:35", "17:35", "18:35", "19:35"] },
    { direction: DIR_SALIDA, times: ["07:23", "08:23", "09:23", "10:31", "11:51", "13:21", "14:23", "15:23", "16:21", "17:21", "18:21", "19:21"] },
  ],
  "bolnica": [
    { direction: DIR_GROBISTA, times: ["06:36", "07:36", "08:36", "09:36", "10:48", "12:08", "13:36", "14:36", "15:36", "16:36", "17:36", "18:36", "19:36"] },
    { direction: DIR_SALIDA, times: ["07:22", "08:22", "09:22", "10:30", "11:50", "13:20", "14:22", "15:22", "16:20", "17:20", "18:20", "19:20"] },
  ],
  "bolnicakruzen": [
    { direction: DIR_GROBISTA, times: ["06:37", "07:37", "08:37", "09:37", "10:50", "12:10", "13:37", "14:37", "15:37", "16:37", "17:37", "18:37", "19:37"] },
  ],
  "bonita": [
    { direction: DIR_GROBISTA, times: ["06:38", "07:38", "08:38", "09:38", "10:51", "12:11", "13:38", "14:38", "15:38", "16:38", "17:38", "18:38", "19:38"] },
  ],
  // "Ст. Општина" in the source sheet — the stop between Бонита and 13 Катница.
  "furnapletve": [
    { direction: DIR_GROBISTA, times: ["06:40", "07:40", "08:40", "09:40", "10:54", "12:14", "13:40", "14:40", "15:40", "16:40", "17:40", "18:40", "19:40"] },
    { direction: DIR_SALIDA, times: ["07:18", "08:18", "09:18", "10:24", "11:44", "13:14", "14:18", "15:18", "16:15", "17:15", "18:15", "19:15"] },
  ],
  "13-katnica": [
    { direction: DIR_GROBISTA, times: ["06:42", "07:42", "08:42", "09:42", "10:55", "12:15", "13:42", "14:42", "15:42", "16:42", "17:42", "18:42", "19:42"] },
    { direction: DIR_SALIDA, times: ["07:17", "08:17", "09:17", "10:22", "11:42", "13:12", "14:17", "15:17", "16:14", "17:14", "18:14", "19:14"] },
  ],
  "pedano": [
    { direction: DIR_GROBISTA, times: ["06:43", "07:43", "08:43", "09:43", "10:56", "12:16", "13:43", "14:43", "15:43", "16:43", "17:43", "18:43", "19:43"] },
    { direction: DIR_SALIDA, times: ["07:16", "08:16", "09:14", "10:20", "11:40", "13:10", "14:16", "15:16", "16:13", "17:13", "18:13", "19:13"] },
  ],
  "ana marija": [
    { direction: DIR_GROBISTA, times: ["06:44", "07:44", "08:44", "09:44", "10:58", "12:18", "13:44", "14:44", "15:44", "16:44", "17:44", "18:44", "19:44"] },
    { direction: DIR_SALIDA, times: ["07:14", "08:14", "09:14", "10:18", "11:38", "13:08", "14:14", "15:14", "16:10", "17:10", "18:10", "19:10"] },
  ],
  "ured": [
    { direction: DIR_GROBISTA, times: ["06:47", "07:47", "08:47", "09:47", "11:01", "12:21", "13:47", "14:47", "15:47", "16:47", "17:47", "18:47", "19:47"] },
    { direction: DIR_SALIDA, times: ["07:11", "08:11", "09:11", "10:15", "11:36", "13:06", "14:11", "15:11", "16:08", "17:08", "18:08", "19:08"] },
  ],
  "ambulanta tutunski": [
    { direction: DIR_GROBISTA, times: ["06:49", "07:49", "08:49", "09:49", "11:04", "12:24", "13:49", "14:49", "15:49", "16:49", "17:49", "18:49", "19:49"] },
    { direction: DIR_SALIDA, times: ["07:10", "08:10", "09:10", "10:13", "11:33", "13:03", "14:10", "15:10", "16:06", "17:06", "18:06", "19:06"] },
  ],
  "ekonomski": [
    { direction: DIR_GROBISTA, times: ["06:50", "07:50", "08:50", "09:50", "11:05", "12:25", "13:50", "14:50", "15:50", "16:50", "17:50", "18:50", "19:50"] },
    { direction: DIR_SALIDA, times: ["07:09", "08:09", "09:09", "10:11", "11:31", "13:01", "14:09", "15:09", "16:05", "17:05", "18:05", "19:05"] },
  ],
  "varos-meanite": [
    { direction: DIR_GROBISTA, times: ["06:51", "07:51", "08:51", "09:51", "11:07", "12:27", "13:51", "14:51", "15:51", "16:51", "17:51", "18:51", "19:51"] },
    { direction: DIR_SALIDA, times: ["07:07", "08:07", "09:07", "10:09", "11:29", "12:59", "14:07", "15:07", "16:03", "17:03", "18:03", "19:03"] },
  ],
  "varos-brasnara": [
    { direction: DIR_GROBISTA, times: ["06:52", "07:52", "08:52", "09:52", "11:08", "12:28", "13:52", "14:52", "15:52", "16:52", "17:52", "18:52", "19:52"] },
    { direction: DIR_SALIDA, times: ["07:06", "08:06", "09:06", "10:08", "11:28", "12:58", "14:06", "15:06", "16:02", "17:01", "18:01", "19:01"] },
  ],
  "varos-trloto": [
    { direction: DIR_GROBISTA, times: ["06:53", "07:53", "08:53", "09:53", "11:10", "12:30", "13:53", "14:53", "15:53", "16:53", "17:53", "18:53", "19:53"] },
    { direction: DIR_SALIDA, times: ["07:04", "08:04", "09:04", "10:05", "11:25", "12:55", "14:05", "15:05", "16:00", "17:00", "18:00", "19:00"] },
  ],
  "grobista": [
    { direction: DIR_SALIDA, times: ["07:00", "08:00", "09:00", "10:00", "11:20", "12:50", "14:00", "15:00"] },
  ],
  // Табана / Завод за Здравство — on the return leg only.
  "belazgrada": [
    { direction: DIR_SALIDA, times: ["07:20", "08:20", "09:20", "10:26", "11:46", "13:16", "14:20", "15:20", "16:17", "17:17", "18:17", "19:17"] },
  ],
  "zavodzdrav": [
    { direction: DIR_SALIDA, times: ["07:21", "08:21", "09:21", "10:28", "11:48", "13:18", "14:21", "15:21", "16:19", "17:19", "18:19", "19:19"] },
  ],
};

// ── Линија 2: Економски Факултет → Рид (hourly) ──────────────────────────────
const LINE2: Record<string, StopSchedule[]> = {
  "ekonomski": [
    { direction: DIR_RID, times: hourly("06:30", 14) },
    { direction: DIR_FAKULTET, times: hourly("07:30", 13) },
  ],
  "internat": [
    { direction: DIR_RID, times: hourly("06:31", 14) },
    { direction: DIR_FAKULTET, times: hourly("07:24", 13) }, // "спроти Орде Чопела"
  ],
  "belston": [
    { direction: DIR_RID, times: hourly("06:32", 14) },
    { direction: DIR_FAKULTET, times: hourly("07:23", 13) },
  ],
  "blaze koneski": [
    { direction: DIR_RID, times: hourly("06:33", 14) },
    { direction: DIR_FAKULTET, times: hourly("07:21", 13) }, // "Пошта Точила"
  ],
  "crkvapetka": [
    { direction: DIR_RID, times: hourly("06:35", 14) },
    { direction: DIR_FAKULTET, times: hourly("07:20", 13) },
  ],
  "l2-av": [
    { direction: DIR_RID, times: hourly("06:37", 14) },
    { direction: DIR_FAKULTET, times: hourly("07:19", 13) },
  ],
  "l2-ft": [
    { direction: DIR_RID, times: hourly("06:39", 14) }, // "Футура суд"
    { direction: DIR_FAKULTET, times: hourly("07:17", 13) },
  ],
  // L2 outbound stops at Палма Шоп; on the way back it stops at Мое Пазарче.
  "palmashop": [{ direction: DIR_RID, times: hourly("06:41", 14) }],
  "lpazarche": [{ direction: DIR_FAKULTET, times: hourly("07:16", 13) }],
  "komercijalna": [
    { direction: DIR_RID, times: hourly("06:43", 14) }, // "Реклами" in the sheet
    { direction: DIR_FAKULTET, times: hourly("07:15", 13) },
  ],
  "l2-ps": [
    { direction: DIR_RID, times: hourly("06:44", 14) },
    { direction: DIR_FAKULTET, times: hourly("07:14", 13) },
  ],
  "furnapletve": [
    { direction: DIR_RID, times: hourly("06:46", 14) }, // "спроти Ст. Општина"
    { direction: DIR_FAKULTET, times: hourly("07:11", 13) },
  ],
  // Return leg detours via Бонита, so Табана is outbound-only on L2.
  "belazgrada": [{ direction: DIR_RID, times: hourly("06:48", 14) }],
  "bonita": [{ direction: DIR_FAKULTET, times: hourly("07:09", 13) }],
  "zavodzdrav": [
    { direction: DIR_RID, times: hourly("06:50", 14) }, // "спроти Дени Мебел"
  ],
  // "Стерна" = Болница Кружен тек.
  "bolnicakruzen": [{ direction: DIR_FAKULTET, times: hourly("07:08", 13) }],
  "bolnica": [
    { direction: DIR_RID, times: hourly("06:52", 14) },
    { direction: DIR_FAKULTET, times: hourly("07:06", 13) },
  ],
  "centropromrul": [
    { direction: DIR_RID, times: hourly("06:53", 14) }, // "Футура рид"
    { direction: DIR_FAKULTET, times: hourly("07:05", 13) },
  ],
  "przelinacas": [{ direction: DIR_RID, times: hourly("06:55", 14) }],
  "ridridteks": [{ direction: DIR_RID, times: hourly("07:00", 14) }],
  "tumbemeh": [{ direction: DIR_RID, times: hourly("07:01", 13) }], // "Тумбе"
  "rid": [{ direction: DIR_RID, times: hourly("07:02", 13) }], // "Рид 3"
};

// ── Линија 3: АМСМ → Амфора (hourly) ─────────────────────────────────────────
const LINE3: Record<string, StopSchedule[]> = {
  "amsm": [
    { direction: DIR_AMFORA, times: hourly("06:30", 14) },
    { direction: DIR_AMSM, times: hourly("07:30", 13) },
  ],
  "ivan elektricar": [{ direction: DIR_AMFORA, times: hourly("06:31", 14) }],
  "bonita": [{ direction: DIR_AMFORA, times: hourly("06:33", 14) }],
  "furnapletve": [
    { direction: DIR_AMFORA, times: hourly("06:35", 14) }, // "Стара Општина"
    { direction: DIR_AMSM, times: hourly("07:18", 13) },
  ],
  "l2-ps": [
    { direction: DIR_AMFORA, times: hourly("06:36", 14) },
    { direction: DIR_AMSM, times: hourly("07:16", 13) },
  ],
  "komercijalna": [
    { direction: DIR_AMFORA, times: hourly("06:38", 14) }, // "Реклами" in the sheet
    { direction: DIR_AMSM, times: hourly("07:15", 13) },
  ],
  "palmashop": [
    { direction: DIR_AMFORA, times: hourly("06:39", 14) },
    { direction: DIR_AMSM, times: hourly("07:14", 13) },
  ],
  // Мое Пазарче is the АМФОРА-direction counterpart of Палма Шоп at this spot
  // (same street, opposite side) — only the westbound leg stops here.
  "lpazarche": [{ direction: DIR_AMFORA, times: hourly("06:39", 14) }],
  "hotel lipa": [
    { direction: DIR_AMFORA, times: hourly("06:40", 14) }, // "под Суд"
    { direction: DIR_AMSM, times: hourly("07:13", 13) }, // "под Липа"
  ],
  "simpo": [
    { direction: DIR_AMFORA, times: hourly("06:42", 14) }, // "Д.Наредникот"
    { direction: DIR_AMSM, times: hourly("07:12", 13) },
  ],
  "hotelsonce": [
    { direction: DIR_AMFORA, times: hourly("06:44", 14) }, // "спроти Макам"
    { direction: DIR_AMSM, times: hourly("07:10", 13) }, // "Макам"
  ],
  "ford servis": [{ direction: DIR_AMFORA, times: hourly("06:45", 14) }], // "Др. Савески"
  "fabrika": [{ direction: DIR_AMSM, times: hourly("07:09", 13) }], // "11 Окт."
  "l3-terminal": [
    { direction: DIR_AMFORA, times: hourly("06:47", 14) },
    { direction: DIR_AMSM, times: hourly("07:07", 13) },
  ],
  "donia": [
    { direction: DIR_AMFORA, times: hourly("06:48", 14) }, // "спроти Лав"
    { direction: DIR_AMSM, times: hourly("07:06", 13) }, // "Лав"
  ],
  "centropromet magacin": [
    { direction: DIR_AMFORA, times: hourly("06:50", 14) }, // "Маслинкара"
    { direction: DIR_AMSM, times: hourly("07:04", 13) },
  ],
  "vasidora": [
    { direction: DIR_AMFORA, times: hourly("06:51", 14) }, // "спроти Микрон"
    { direction: DIR_AMSM, times: hourly("07:03", 13) }, // "Микрон"
  ],
  "zabinomaalo": [
    { direction: DIR_AMFORA, times: hourly("06:52", 14) }, // "Д.Бањарот"
    { direction: DIR_AMSM, times: hourly("07:02", 13) },
  ],
  "amfora": [{ direction: DIR_AMSM, times: hourly("07:00", 14) }],
  // Return-leg only on L3 (the outbound runs the Бонита side).
  "belazgrada": [{ direction: DIR_AMSM, times: hourly("07:20", 13) }], // "Табана"
  "zavodzdrav": [{ direction: DIR_AMSM, times: hourly("07:22", 13) }], // "спроти Дени Мебел"
  "l3-5pazar": [{ direction: DIR_AMSM, times: hourly("07:23", 13) }],
  "5taprilep": [{ direction: DIR_AMSM, times: hourly("07:24", 13) }], // "5та Прилепска 2"
};

// ── Недела (line4): Салида → Н.Гробишта, недела и празници (hourly) ──────────
// Runs ONLY on Sundays and public holidays; on those days lines 1–3 don't run.
// Same alias mapping as above; additionally Ќутуче / Турско училиште → Ана
// Марија, Меше маркет → Педано (matched by sequence), Стерна → Болница
// Кружен тек, Тутунски сала → Сала Тутунски (own stop, not Амбуланта).
// Rows with no map stop: Автоконтрол (07:04…), Венеција (07:33…).
const LINE4: Record<string, StopSchedule[]> = {
  "hotelsalida": [
    { direction: DIR_GROBISTA, times: hourly("06:30", 6) },
    { direction: DIR_SALIDA, times: hourly("08:30", 5) },
  ],
  "rampo levkata": [
    { direction: DIR_GROBISTA, times: hourly("06:31", 6) },
    { direction: DIR_SALIDA, times: hourly("08:10", 6) },
  ],
  "maticno": [
    { direction: DIR_GROBISTA, times: hourly("06:32", 6) },
    { direction: DIR_SALIDA, times: hourly("08:09", 6) },
  ],
  "teatar": [
    { direction: DIR_GROBISTA, times: hourly("06:34", 6) },
    { direction: DIR_SALIDA, times: hourly("08:07", 6) },
  ],
  "bolnica": [
    { direction: DIR_GROBISTA, times: hourly("06:36", 6) },
    { direction: DIR_SALIDA, times: hourly("08:05", 6) },
  ],
  // "Стерна" (= Болница Кружен тек) — outbound only.
  "bolnicakruzen": [{ direction: DIR_GROBISTA, times: hourly("06:37", 6) }],
  // "Дени Мебел" — return leg only.
  "zavodzdrav": [{ direction: DIR_SALIDA, times: hourly("08:04", 6) }],
  "bonita": [{ direction: DIR_GROBISTA, times: hourly("06:38", 6) }],
  // "Табана" — return leg only.
  "belazgrada": [{ direction: DIR_SALIDA, times: hourly("08:02", 6) }],
  // "Ст. Општина" / "спроти Ст. Општина".
  "furnapletve": [
    { direction: DIR_GROBISTA, times: hourly("06:40", 6) },
    { direction: DIR_SALIDA, times: hourly("08:00", 6) },
  ],
  "13-katnica": [
    { direction: DIR_GROBISTA, times: hourly("06:42", 6) },
    { direction: DIR_SALIDA, times: hourly("07:59", 6) },
  ],
  // "Педан" outbound / "Меше маркет" return.
  "pedano": [
    { direction: DIR_GROBISTA, times: hourly("06:43", 6) },
    { direction: DIR_SALIDA, times: hourly("07:58", 6) },
  ],
  // "Ќутуче" outbound / "Турско училиште" return.
  "ana marija": [
    { direction: DIR_GROBISTA, times: hourly("06:44", 6) },
    { direction: DIR_SALIDA, times: hourly("07:56", 6) },
  ],
  "ured": [
    { direction: DIR_GROBISTA, times: hourly("06:47", 6) },
    { direction: DIR_SALIDA, times: hourly("07:54", 6) }, // "наспроти Уред"
  ],
  // "Тутунски сала" in the sheet.
  "sala tutunski": [
    { direction: DIR_GROBISTA, times: hourly("06:49", 6) },
    { direction: DIR_SALIDA, times: hourly("07:53", 6) },
  ],
  "dom zabrcanec": [
    { direction: DIR_GROBISTA, times: hourly("06:51", 6) }, // "дом С.Забрчанец"
    { direction: DIR_SALIDA, times: hourly("07:51", 6) },
  ],
  // "спроти Макпетрол" — outbound only.
  "makpetrol": [{ direction: DIR_GROBISTA, times: hourly("06:53", 6) }],
  // "пред Н.Автобуска" — return leg only.
  "l2-av": [{ direction: DIR_SALIDA, times: hourly("07:48", 6) }],
  "crkvapetka": [
    { direction: DIR_GROBISTA, times: hourly("06:54", 6) }, // "Св.Петка"
    { direction: DIR_SALIDA, times: hourly("07:46", 6) }, // "спроти Св.Петка"
  ],
  // "пред Б.Конески" — return leg only.
  "blaze koneski": [{ direction: DIR_SALIDA, times: hourly("07:45", 6) }],
  "belston": [
    { direction: DIR_GROBISTA, times: hourly("06:56", 6) },
    { direction: DIR_SALIDA, times: hourly("07:43", 6) },
  ],
  // "спроти О.Чопела" outbound / "Интернат" return.
  "internat": [
    { direction: DIR_GROBISTA, times: hourly("06:57", 6) },
    { direction: DIR_SALIDA, times: hourly("07:41", 6) },
  ],
  "ekonomski": [
    { direction: DIR_GROBISTA, times: hourly("06:59", 6) }, // "Факултет"
    { direction: DIR_SALIDA, times: hourly("07:40", 6) },
  ],
  "varos-meanite": [
    { direction: DIR_GROBISTA, times: hourly("07:01", 6) },
    { direction: DIR_SALIDA, times: hourly("07:38", 6) },
  ],
  "varos-brasnara": [
    { direction: DIR_GROBISTA, times: hourly("07:02", 6) },
    { direction: DIR_SALIDA, times: hourly("07:36", 6) },
  ],
  "varos-trloto": [
    { direction: DIR_GROBISTA, times: hourly("07:02", 6) },
    { direction: DIR_SALIDA, times: hourly("07:35", 6) },
  ],
  "grobista": [{ direction: DIR_SALIDA, times: hourly("07:30", 6) }],
};

export const TIMETABLES: Record<string, Record<string, StopSchedule[]>> = {
  line1: LINE1,
  line2: LINE2,
  line3: LINE3,
  line4: LINE4,
};

// ── Sunday / holiday service ──────────────────────────────────────────────────
// The Недела line replaces lines 1–3 on Sundays and public holidays.
export const SUNDAY_ROUTE_ID = "line4";

// Fixed-date national holidays (MM-DD), observed every year.
const HOLIDAYS_FIXED = [
  "01-01", // Нова Година
  "01-07", // Божиќ
  "05-01", // Ден на трудот
  "05-24", // Св. Кирил и Методиј
  "08-02", // Илинден
  "09-08", // Ден на независноста
  "10-11", // Ден на востанието
  "10-23", // Ден на македонската револуционерна борба
  "12-08", // Св. Климент Охридски
];

// Movable holidays (Велигден, Рамазан Бајрам…) — add per year as "YYYY-MM-DD".
export const HOLIDAY_DATES: string[] = [];

const pad = (n: number) => String(n).padStart(2, "0");
const ymdOf = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// One-off service overrides — an inclusive date range (local "YYYY-MM-DD") when
// only the Недела line runs, e.g. a festival closes the town centre. A single
// entry drives BOTH the Sunday-service switch below AND the banner shown on the
// bus map (activeServiceNotice). Remove an entry once its dates have passed.
type ServiceOverride = { from: string; to: string; message: string };
export const SERVICE_OVERRIDES: ServiceOverride[] = [
  {
    // Пиво Фест 2026 — само неделната линија, 16–20 јули.
    from: "2026-07-16",
    to: "2026-07-20",
    message: "Поради Пиво Фест, возиме само по неделната линија.",
  },
];

// The service override in effect on `d`, if any.
function activeOverride(d: Date): ServiceOverride | undefined {
  const ymd = ymdOf(d);
  return SERVICE_OVERRIDES.find((o) => ymd >= o.from && ymd <= o.to);
}

// Short banner to show on the bus map while an override is active, else null.
export function activeServiceNotice(d: Date = new Date()): string | null {
  return activeOverride(d)?.message ?? null;
}

// True when the Недела timetable applies (Sunday, a public holiday, or a
// festival override).
export function isSundayService(d: Date = new Date()): boolean {
  if (d.getDay() === 0) return true;
  const mmdd = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ymd = `${d.getFullYear()}-${mmdd}`;
  if (HOLIDAYS_FIXED.includes(mmdd) || HOLIDAY_DATES.includes(ymd)) return true;
  return activeOverride(d) !== undefined;
}

// Timetable direction a bus serves when travelling the route path forward
// (increasing distance along the polyline):
// line1 runs Гробишта → Салида, line2 Факултет → Рид, line3 Амфора → АМСМ,
// line4 (Недела) Салида → Н.Гробишта.
const FORWARD_DIR: Record<string, string> = {
  line1: DIR_SALIDA,
  line2: DIR_RID,
  line3: DIR_AMSM,
  line4: DIR_GROBISTA,
};

// Next scheduled departure (≥ now) at the named stop for this route and travel
// direction — the bus panel shows it beside the upcoming stop. Null when the
// route has no timetable, the stop isn't in it, or today's runs are done.
export function nextDepartureAt(
  routeId: string,
  stopName: string,
  forward: boolean,
  now: Date = new Date(),
): string | null {
  // A route only has departures on the days it actually runs: Недела on
  // Sundays/holidays, lines 1–3 the rest of the week.
  if (isSundayService(now) !== (routeId === SUNDAY_ROUTE_ID)) return null;
  const table = TIMETABLES[routeId];
  if (!table) return null;
  const stop = BUS_STOPS.find((s) => s.name === stopName);
  const schedules = stop ? table[stop.id] : undefined;
  if (!schedules?.length) return null;

  const fwd = FORWARD_DIR[routeId];
  const direction = forward
    ? fwd
    : schedules.find((s) => s.direction !== fwd)?.direction;
  const sched = schedules.find((s) => s.direction === direction);
  if (!sched) return null;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  return sched.times.find((t) => hhmmToMin(t) >= nowMin - GRACE_MIN) ?? null;
}

// All timetable entries for one stop across every route that has a timetable.
export function timetableForStop(
  stopId: string,
): { routeId: string; schedules: StopSchedule[] }[] {
  const out: { routeId: string; schedules: StopSchedule[] }[] = [];
  for (const [routeId, stops] of Object.entries(TIMETABLES)) {
    const schedules = stops[stopId];
    if (schedules?.length) out.push({ routeId, schedules });
  }
  return out;
}
