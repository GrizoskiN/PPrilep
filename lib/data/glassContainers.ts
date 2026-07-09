// ── Стаклена амбалажа: локации на контејнери (Прилеп) ──────────────────────────
//
// Локации на контејнерите за селектирање на стаклена амбалажа во Прилеп.
// Постои 54 локации: 44 постојни (стандардни контејнери) + 10 нови „Иглу“
// контејнери поставени во јули 2026 од Пакомак и ЈКП „Комуналец“.
//
// ВАЖНО за координатите: `lat`/`lng` се ПРИБЛИЖНИ, поставени рачно по името на
// улицата. Некои треба да се исправат на точна позиција — ова е појдовна мапа,
// не геодетски прецизна. Дотерај ги вредностите тука кога ќе се потврди точното
// место на секој контејнер.

export type GlassContainerKind = "iglu" | "standard";

export interface GlassContainer {
  /** Стабилен id (за React ключеви и идни точни пинови). */
  id: string;
  /** Опис на локацијата, како што е даден од Комуналец. */
  name: string;
  /** Улица / населба (за листа и пребарување). */
  street: string;
  /** „iglu“ = нов Иглу контејнер (јули 2026); „standard“ = постоен. */
  kind: GlassContainerKind;
  lat: number;
  lng: number;
  /**
   * Фотографии од локацијата (URL-и). Опционално — додади ги тука кога ќе се
   * фотографира контејнерот. Прикажани се во попапот на мапата и во листата.
   */
  photos?: string[];
}

// 10 нови „Иглу“ контејнери — поставени во јули 2026.
const IGLU: GlassContainer[] = [
  { id: "iglu-01", name: "Ул. „Бидимаж“ — плато пред градинка", street: "Бидимаж", kind: "iglu", lat: 41.3410, lng: 21.5490 },
  { id: "iglu-02", name: "Бул. „Гоце Делчев“ — кај нова автобуска, кафичи", street: "Гоце Делчев", kind: "iglu", lat: 41.3400, lng: 21.5625 },
  { id: "iglu-03", name: "Ул. „Војводинска“ — Точила, згради среден пункт", street: "Војводинска", kind: "iglu", lat: 41.3515, lng: 21.5685 },
  { id: "iglu-04", name: "Ул. „Цар Самоил“ — пред Економско училиште", street: "Цар Самоил", kind: "iglu", lat: 41.3490, lng: 21.5595 },
  { id: "iglu-05", name: "Ул. „Октомвриска“ — Завод за здравствена заштита, кафичи", street: "Октомвриска", kind: "iglu", lat: 41.3508, lng: 21.5530 },
  { id: "iglu-06", name: "Згради Ѓогдере — среден асфалтен влез во згради", street: "Ѓогдере", kind: "iglu", lat: 41.3535, lng: 21.5605 },
  { id: "iglu-07", name: "Ул. „Димо Наредникот“ — пункт мост", street: "Димо Наредникот", kind: "iglu", lat: 41.3440, lng: 21.5570 },
  { id: "iglu-08", name: "Згради под касарна", street: "Под касарна", kind: "iglu", lat: 41.3555, lng: 21.5560 },
  { id: "iglu-09", name: "Населба Ѓогдере 1 — пред Урбана заедница", street: "Ѓогдере", kind: "iglu", lat: 41.3542, lng: 21.5595 },
  { id: "iglu-10", name: "Ул. „Васко Карангелески“ — пункт црвена зграда", street: "Васко Карангелески", kind: "iglu", lat: 41.3442, lng: 21.5605 },
];

// 44 постојни, веќе добро познати локации.
const STANDARD: GlassContainer[] = [
  { id: "std-01", name: "Ул. „Кеј 1 Мај“", street: "Кеј 1 Мај", kind: "standard", lat: 41.3462, lng: 21.5540 },
  { id: "std-02", name: "Ул. „11 Октомври“ 1", street: "11 Октомври", kind: "standard", lat: 41.3448, lng: 21.5525 },
  { id: "std-03", name: "Ул. „11 Октомври“ 2", street: "11 Октомври", kind: "standard", lat: 41.3440, lng: 21.5535 },
  { id: "std-04", name: "Ул. „Македонска народна ударна бригада“", street: "Македонска народна ударна бригада", kind: "standard", lat: 41.3470, lng: 21.5510 },
  { id: "std-05", name: "Ул. „Кеј 9-ти септември“", street: "Кеј 9-ти септември", kind: "standard", lat: 41.3455, lng: 21.5560 },
  { id: "std-06", name: "Р-1702", street: "Р-1702", kind: "standard", lat: 41.3330, lng: 21.5680 },
  { id: "std-07", name: "Ул. „Ѓоре Ѓорески“", street: "Ѓоре Ѓорески", kind: "standard", lat: 41.3460, lng: 21.5490 },
  { id: "std-08", name: "Ул. „Индустриска“ 1", street: "Индустриска", kind: "standard", lat: 41.3350, lng: 21.5745 },
  { id: "std-09", name: "Ул. „Индустриска“ 2", street: "Индустриска", kind: "standard", lat: 41.3340, lng: 21.5760 },
  { id: "std-10", name: "Ул. „Јоска Јорданоски“ — околу бр. 47", street: "Јоска Јорданоски", kind: "standard", lat: 41.3435, lng: 21.5460 },
  { id: "std-11", name: "Ул. „Мирче Ацев“ — околу бр. 148", street: "Мирче Ацев", kind: "standard", lat: 41.3425, lng: 21.5500 },
  { id: "std-12", name: "Ул. „Орце Николов“", street: "Орце Николов", kind: "standard", lat: 41.3452, lng: 21.5502 },
  { id: "std-13", name: "Бул. „Гоце Делчев“ 1", street: "Гоце Делчев", kind: "standard", lat: 41.3430, lng: 21.5585 },
  { id: "std-14", name: "Бул. „Гоце Делчев“ 2", street: "Гоце Делчев", kind: "standard", lat: 41.3410, lng: 21.5610 },
  { id: "std-15", name: "Ул. „Александар Македонски“ 1", street: "Александар Македонски", kind: "standard", lat: 41.3505, lng: 21.5665 },
  { id: "std-16", name: "Ул. „Александар Македонски“ 2", street: "Александар Македонски", kind: "standard", lat: 41.3495, lng: 21.5680 },
  { id: "std-17", name: "Ул. „Бидимаж“ 1", street: "Бидимаж", kind: "standard", lat: 41.3405, lng: 21.5480 },
  { id: "std-18", name: "Ул. „Бидимаж“ 2", street: "Бидимаж", kind: "standard", lat: 41.3395, lng: 21.5468 },
  { id: "std-19", name: "Ул. „Бидимаж“ 3", street: "Бидимаж", kind: "standard", lat: 41.3388, lng: 21.5455 },
  { id: "std-20", name: "Ул. „Браќа Бешироски“", street: "Браќа Бешироски", kind: "standard", lat: 41.3480, lng: 21.5470 },
  { id: "std-21", name: "Ул. „Браќа Миладиновци“ 1", street: "Браќа Миладиновци", kind: "standard", lat: 41.3492, lng: 21.5478 },
  { id: "std-22", name: "Ул. „Браќа Миладиновци“ 2", street: "Браќа Миладиновци", kind: "standard", lat: 41.3498, lng: 21.5488 },
  { id: "std-23", name: "Ул. „Васко Карангелески“", street: "Васко Карангелески", kind: "standard", lat: 41.3448, lng: 21.5595 },
  { id: "std-24", name: "Ул. „Гога Јанкулоски“", street: "Гога Јанкулоски", kind: "standard", lat: 41.3465, lng: 21.5615 },
  { id: "std-25", name: "Ул. „Гога Ацев“", street: "Гога Ацев", kind: "standard", lat: 41.3472, lng: 21.5628 },
  { id: "std-26", name: "Ул. „Илка Присаѓанка“", street: "Илка Присаѓанка", kind: "standard", lat: 41.3455, lng: 21.5455 },
  { id: "std-27", name: "Ул. „Климент Охридски“", street: "Климент Охридски", kind: "standard", lat: 41.3488, lng: 21.5540 },
  { id: "std-28", name: "Ул. „Мечкин Камен“", street: "Мечкин Камен", kind: "standard", lat: 41.3512, lng: 21.5560 },
  { id: "std-29", name: "Ул. „Маре Цилкоска“", street: "Маре Цилкоска", kind: "standard", lat: 41.3520, lng: 21.5575 },
  { id: "std-30", name: "Ул. „Борка Левата“", street: "Борка Левата", kind: "standard", lat: 41.3450, lng: 21.5588 },
  { id: "std-31", name: "Ул. „Кузман Јосифоски“", street: "Кузман Јосифоски", kind: "standard", lat: 41.3468, lng: 21.5575 },
  { id: "std-32", name: "Ул. „Наум Охридски“", street: "Наум Охридски", kind: "standard", lat: 41.3418, lng: 21.5545 },
  { id: "std-33", name: "Ул. „Октомвриска“ 2", street: "Октомвриска", kind: "standard", lat: 41.3500, lng: 21.5520 },
  { id: "std-34", name: "Ул. „Патрис Лумумба“", street: "Патрис Лумумба", kind: "standard", lat: 41.3395, lng: 21.5560 },
  { id: "std-35", name: "Ул. „Пере Тошев“", street: "Пере Тошев", kind: "standard", lat: 41.3475, lng: 21.5548 },
  { id: "std-36", name: "Ул. „Прилепски Бранители“", street: "Прилепски Бранители", kind: "standard", lat: 41.3380, lng: 21.5580 },
  { id: "std-37", name: "Ул. „Разловечко востание“", street: "Разловечко востание", kind: "standard", lat: 41.3530, lng: 21.5540 },
  { id: "std-38", name: "Ул. „Рајко Жинзифов“", street: "Рајко Жинзифов", kind: "standard", lat: 41.3500, lng: 21.5450 },
  { id: "std-39", name: "Ул. „Стеван Апостолски“", street: "Стеван Апостолски", kind: "standard", lat: 41.3525, lng: 21.5520 },
  { id: "std-40", name: "Ул. „Трајко Сандански“", street: "Трајко Сандански", kind: "standard", lat: 41.3520, lng: 21.5700 },
  { id: "std-41", name: "Ул. „Трајко Николоски“ — 2 контејнери во собирно место пред Стопански двор на „Комуналец“", street: "Трајко Николоски", kind: "standard", lat: 41.3360, lng: 21.5720 },
  { id: "std-42", name: "Ул. „Февруарски поход“", street: "Февруарски поход", kind: "standard", lat: 41.3370, lng: 21.5600 },
  { id: "std-43", name: "Ул. „Цар Самоил“ 1", street: "Цар Самоил", kind: "standard", lat: 41.3485, lng: 21.5605 },
  { id: "std-44", name: "Ул. „Цар Самоил“ 2", street: "Цар Самоил", kind: "standard", lat: 41.3478, lng: 21.5618 },
];

/** Сите 54 локации (10 Иглу + 44 постојни). */
export const GLASS_CONTAINERS: GlassContainer[] = [...IGLU, ...STANDARD];

export const GLASS_CONTAINER_COUNT = GLASS_CONTAINERS.length;
export const IGLU_CONTAINERS = IGLU;
export const STANDARD_CONTAINERS = STANDARD;
