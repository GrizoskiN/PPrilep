// Static bus route data.
// All three lines are now GPS-precise (digitized from map).
// Coordinates are [lng, lat] (GeoJSON convention).

export interface BusStop {
  id: string;
  name: string;
  coordinates: [number, number];
  routeIds: string[];
}

export interface BusRoute {
  id: string;
  name: string;
  description: string;
  color: string;
  stopIds: string[];
  path: [number, number][];
}

// ─── Live vehicles ──────────────────────────────────────────────────────────
// Physical GPS trackers streaming to Flespi. `deviceId` is the Flespi device id
// (gw/devices/<id>), `routeId` is the line it currently runs (matches a
// BusRoute.id below). To reassign a bus to another line, change its routeId.
export interface LiveBus {
  deviceId: number;
  label: string;
  routeId: string;
}

export const LIVE_BUSES: LiveBus[] = [
  { deviceId: 8414769, label: "Автобус 1", routeId: "line1" },
];

// ─── Stops ────────────────────────────────────────────────────────────────────

export const BUS_STOPS: BusStop[] = [

  // ── Line 1 only (GPS-precise) ──────────────────────────────────────────────
  { id: "grobista",       name: "Нови Градски Гробишта",      coordinates: [21.5061205, 41.3713424], routeIds: ["line1"] },
  { id: "varos-trloto",   name: "Варош Кај Трлото",            coordinates: [21.5190861, 41.3632364], routeIds: ["line1"] },
  { id: "varos-brasnara", name: "Варош Брашнара",              coordinates: [21.5313211, 41.3559289], routeIds: ["line1"] },
  { id: "varos-meanite",  name: "Варош Кај Меаните",           coordinates: [21.5371692, 41.3554870], routeIds: ["line1"] },
  { id: "pedano",         name: "Педано",                      coordinates: [21.5566092, 41.3507848], routeIds: ["line1"] },
  { id: "stadion",        name: "Градски Стадион",             coordinates: [21.5631992, 41.3454199], routeIds: ["line1", "line3"] },
  { id: "rampolevkata",   name: "ООУ Рампо Левката",           coordinates: [21.5572817, 41.3422259], routeIds: ["line1"] },
  { id: "hotelsalida",    name: "Хотел Салида",                coordinates: [21.5556239, 41.3326856], routeIds: ["line1"] },
  { id: "terminal",       name: "Терминал",                    coordinates: [21.5548495, 41.3378030], routeIds: ["line1"] },

  // ── Line 1 center spine (GPS-precise) ─────────────────────────────────────
  { id: "avtobusna",      name: "Автобуска Станица",           coordinates: [21.5504140, 41.3489952], routeIds: ["line1"] },
  { id: "palmasop",       name: "Палма Шоп",                   coordinates: [21.5536115, 41.3490956], routeIds: ["line1"] },
  { id: "lastrada",       name: "Ла Страда",                   coordinates: [21.5563634, 41.3481554], routeIds: ["line1"] },

  // ── Shared Line 1 + 2 (GPS-precise on both) ───────────────────────────────
  { id: "ekonomski",      name: "Економски Факултет",          coordinates: [21.5418388, 41.3541164], routeIds: ["line1", "line2"] },
  { id: "blakoneski",     name: "ООУ Блаже Конески",           coordinates: [21.5435715, 41.3525864], routeIds: ["line1", "line2"] },
  { id: "teatar",         name: "Театар",                      coordinates: [21.5632836, 41.3448273], routeIds: ["line1", "line2"] },

  // ── Shared Lines 1 + 2 + 3 (GPS-precise) ─────────────────────────────────
  { id: "furnapletve",    name: "Фурна Плетварец",             coordinates: [21.5586805, 41.3475819], routeIds: ["line1", "line2", "line3"] },
  { id: "belazgrada",     name: "Бела Зграда Табана",          coordinates: [21.5612777, 41.3465964], routeIds: ["line1", "line2", "line3"] },

  // ── Shared Lines 2 + 3 (GPS-precise) ─────────────────────────────────────
  { id: "zavodzdrav",     name: "Завод за Здравство",          coordinates: [21.5644247, 41.3447533], routeIds: ["line2", "line3"] },
  { id: "l2-ps",          name: "Палма Шоп",                   coordinates: [21.5550169, 41.3469059], routeIds: ["line2", "line3"] },

  // ── Line 2 only — northwest section (GPS-precise) ─────────────────────────
  { id: "internat",       name: "Интернат",                    coordinates: [21.5417384, 41.3511023], routeIds: ["line2"] },
  { id: "belston",        name: "Белстон",                     coordinates: [21.5380703, 41.3505932], routeIds: ["line2"] },
  { id: "crkvapetka",     name: "Црква Св. Петка",             coordinates: [21.5379059, 41.3483448], routeIds: ["line2"] },

  // ── Line 2 only — center section (GPS-precise) ────────────────────────────
  { id: "l2-av",          name: "Автобуска Станица",           coordinates: [21.5402440, 41.3444772], routeIds: ["line2"] },
  { id: "zadsudot",       name: "Зад Судот",                   coordinates: [21.5499881, 41.3444018], routeIds: ["line2"] },
  { id: "l2-ft",          name: "Футур Маркет",                coordinates: [21.5469199, 41.3435364], routeIds: ["line2"] },

  // ── Line 2 only — southeast section (GPS-precise) ─────────────────────────
  { id: "bolnica",        name: "Болница",                     coordinates: [21.5640745, 41.3423410], routeIds: ["line2"] },
  { id: "centropromrul",  name: "Ул. Мирче Ацев Центропромет", coordinates: [21.5637074, 41.3394007], routeIds: ["line2"] },
  { id: "przelinacas",    name: "Пржилница АС",                coordinates: [21.5643404, 41.3382201], routeIds: ["line2"] },
  { id: "ridridteks",     name: "Рид / Ридтекс",               coordinates: [21.5627064, 41.3357006], routeIds: ["line2"] },
  { id: "rid",            name: "Рид",                         coordinates: [21.5657428, 41.3368475], routeIds: ["line2"] },
  { id: "tumbemeh",       name: "Тумбе Механичар",             coordinates: [21.5649477, 41.3380556], routeIds: ["line2"] },

  // ── Line 3 only (GPS-precise) ─────────────────────────────────────────────
  { id: "amfora",         name: "Амфора Ресторан",             coordinates: [21.5221594, 41.3430948], routeIds: ["line3"] },
  { id: "zabinomaalo",    name: "Жабино Маало",                coordinates: [21.5286504, 41.3433945], routeIds: ["line3"] },
  { id: "centropromet",   name: "Центропромет Магацини",       coordinates: [21.5362695, 41.3438081], routeIds: ["line3"] },
  { id: "l3-donia",       name: "Дониа",                       coordinates: [21.5408754, 41.3410428], routeIds: ["line3"] },
  { id: "l3-terminal",    name: "Терминал",                    coordinates: [21.5403820, 41.3370358], routeIds: ["line3"] },
  { id: "fabrika",        name: "Ф-ка 11ти Октомври",          coordinates: [21.5422201, 41.3347970], routeIds: ["line3"] },
  { id: "l3-s7",          name: "Рид Приод",                   coordinates: [21.5434734, 41.3356716], routeIds: ["line3"] },
  { id: "hotelsonce",     name: "Хотел Сонце",                 coordinates: [21.5461671, 41.3371827], routeIds: ["line3"] },
  { id: "simpo",          name: "Симпо",                       coordinates: [21.5501403, 41.3405239], routeIds: ["line3"] },
  { id: "l3-s10",         name: "Медицинска",                  coordinates: [21.5485254, 41.3427349], routeIds: ["line3"] },
  { id: "futurmarket",    name: "Футур Маркет",                coordinates: [21.5499472, 41.3444179], routeIds: ["line3"] },
  { id: "l3-5pazar",      name: "5та Прилепска Пазарче",       coordinates: [21.5670098, 41.3441109], routeIds: ["line3"] },
  { id: "5taprilep",      name: "5та Прилепска Згради",        coordinates: [21.5684932, 41.3478832], routeIds: ["line3"] },
  { id: "amsm",           name: "АМСМ",                        coordinates: [21.5705393, 41.3477620], routeIds: ["line3"] },
  { id: "l3-s20",         name: "АМСМ Приод",                  coordinates: [21.5715162, 41.3506873], routeIds: ["line3"] },
  { id: "lukoil",         name: "Лук Оил",                     coordinates: [21.5792654, 41.3558421], routeIds: ["line3"] },
];

// ─── Routes ──────────────────────────────────────────────────────────────────

export const BUS_ROUTES: BusRoute[] = [
  {
    id: "line1",
    name: "Линија 1",
    description: "Нови Гробишта — Хотел Салида",
    color: "#16a34a",
    stopIds: [
      "grobista", "varos-trloto", "varos-brasnara", "varos-meanite",
      "ekonomski", "blakoneski",
      "avtobusna", "palmasop", "pedano", "lastrada",
      "furnapletve", "belazgrada", "stadion", "teatar",
      "rampolevkata", "hotelsonce", "terminal", "hotelsalida",
    ],
    path: [
      [21.5062268, 41.3713847], [21.5082940, 41.3699429], [21.5113362, 41.3676668],
      [21.5143149, 41.3657516], [21.5151742, 41.3652142], [21.5194131, 41.3631398],
      [21.5207163, 41.3622692], [21.5223918, 41.3609794], [21.5239241, 41.3596358],
      [21.5253419, 41.3584642], [21.5273468, 41.3574968], [21.5291512, 41.3566368],
      [21.5297097, 41.3564971], [21.5305403, 41.3560994], [21.5312850, 41.3559596],
      [21.5325165, 41.3555511], [21.5339486, 41.3553792], [21.5351229, 41.3554759],
      [21.5359249, 41.3554974], [21.5370132, 41.3556264], [21.5376290, 41.3553254],
      [21.5384453, 41.3551104], [21.5405218, 41.3548847], [21.5410230, 41.3545299],
      [21.5439015, 41.3531432], [21.5468515, 41.3514555], [21.5477251, 41.3508212],
      [21.5485270, 41.3503912], [21.5491858, 41.3501117], [21.5508183, 41.3486926],
      [21.5517635, 41.3479831], [21.5517349, 41.3477358], [21.5518924, 41.3476606],
      [21.5521072, 41.3481658], [21.5523506, 41.3483486], [21.5530667, 41.3485421],
      [21.5535536, 41.3489721], [21.5537111, 41.3494021], [21.5537254, 41.3500149],
      [21.5540261, 41.3502407], [21.5548138, 41.3506062], [21.5553580, 41.3511007],
      [21.5559021, 41.3517027], [21.5567471, 41.3517887], [21.5563318, 41.3477358],
      [21.5561742, 41.3474133], [21.5565034, 41.3474563], [21.5570190, 41.3475853],
      [21.5590239, 41.3475853], [21.5595108, 41.3475638], [21.5614727, 41.3464672],
      [21.5638070, 41.3451018], [21.5603127, 41.3435429], [21.5532240, 41.3404679],
      [21.5544269, 41.3385218], [21.5551429, 41.3373498], [21.5556871, 41.3357799],
      [21.5553291, 41.3344573], [21.5552289, 41.3338014], [21.5554007, 41.3330809],
      [21.5557015, 41.3325647],
    ],
  },
  {
    id: "line2",
    name: "Линија 2",
    description: "Економски Факултет — Тумбе Механичар",
    color: "#2563eb",
    stopIds: [
      "ekonomski", "blakoneski", "internat", "belston", "crkvapetka",
      "l2-av", "l2-ft", "zadsudot", "l2-ps",
      "furnapletve", "belazgrada", "zavodzdrav",
      "bolnica", "centropromrul", "przelinacas", "ridridteks", "rid", "tumbemeh",
    ],
    path: [
      [21.5417837, 41.3541560], [21.5437828, 41.3531183], [21.5435702, 41.3525915],
      [21.5431023, 41.3517773], [21.5417199, 41.3511068], [21.5406778, 41.3506119],
      [21.5380620, 41.3505959], [21.5378918, 41.3506119], [21.5379131, 41.3483608],
      [21.5396329, 41.3445811], [21.5468975, 41.3435531], [21.5479114, 41.3433961],
      [21.5499915, 41.3443927], [21.5550192, 41.3469038], [21.5564094, 41.3475316],
      [21.5583640, 41.3476336], [21.5594641, 41.3475678], [21.5596000, 41.3475286],
      [21.5612933, 41.3465791], [21.5643977, 41.3447743], [21.5663210, 41.3438561],
      [21.5640633, 41.3423259], [21.5620059, 41.3409409], [21.5629466, 41.3399521],
      [21.5637097, 41.3394106], [21.5643055, 41.3391752], [21.5643473, 41.3382177],
      [21.5643264, 41.3370797], [21.5639710, 41.3365931], [21.5632393, 41.3362870],
      [21.5622986, 41.3360594], [21.5630616, 41.3353217], [21.5649117, 41.3362164],
      [21.5658734, 41.3369541], [21.5643473, 41.3387121],
    ],
  },
  {
    id: "line3",
    name: "Линија 3",
    description: "Амфора — Лук Оил",
    color: "#ea580c",
    stopIds: [
      "amfora", "zabinomaalo", "centropromet", "l3-donia", "l3-terminal",
      "fabrika", "l3-s7", "hotelsonce", "simpo", "l3-s10",
      "futurmarket", "l2-ps",
      "furnapletve", "belazgrada", "stadion", "zavodzdrav",
      "l3-5pazar", "5taprilep", "amsm", "l3-s20", "lukoil",
    ],
    path: [
      [21.5221442, 41.3431045], [21.5256509, 41.3431476], [21.5286217, 41.3433943],
      [21.5355367, 41.3439258], [21.5362699, 41.3438309], [21.5403911, 41.3431571],
      [21.5404543, 41.3424642], [21.5409221, 41.3410785], [21.5409853, 41.3405944],
      [21.5403911, 41.3370256], [21.5407577, 41.3355093], [21.5418955, 41.3345411],
      [21.5422494, 41.3348259], [21.5434757, 41.3356707], [21.5461557, 41.3371704],
      [21.5488739, 41.3385088], [21.5508712, 41.3394389], [21.5501254, 41.3405305],
      [21.5485452, 41.3427324], [21.5480901, 41.3432639], [21.5482544, 41.3435581],
      [21.5504035, 41.3445831], [21.5550654, 41.3469069], [21.5562158, 41.3474383],
      [21.5565571, 41.3474573], [21.5568226, 41.3475427], [21.5586682, 41.3475902],
      [21.5594773, 41.3475427], [21.5599324, 41.3473719], [21.5612977, 41.3465937],
      [21.5632066, 41.3454168], [21.5644075, 41.3447620], [21.5660636, 41.3439932],
      [21.5662912, 41.3436610], [21.5666830, 41.3437749], [21.5670117, 41.3441166],
      [21.5705134, 41.3477515], [21.5719988, 41.3492452], [21.5718976, 41.3494540],
      [21.5716321, 41.3496153], [21.5710127, 41.3499854], [21.5715057, 41.3506782],
      [21.5729721, 41.3519403], [21.5741225, 41.3529367], [21.5752224, 41.3535725],
      [21.5772956, 41.3544265], [21.5793056, 41.3558499], [21.5790528, 41.3558119],
      [21.5772450, 41.3544929], [21.5744512, 41.3532688], [21.5726561, 41.3517600],
      [21.5713540, 41.3506022], [21.5706082, 41.3495109], [21.5685097, 41.3478406],
      [21.5658170, 41.3458476], [21.5640092, 41.3450789], [21.5631749, 41.3454300],
    ],
  },
];
