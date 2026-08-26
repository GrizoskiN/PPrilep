/**
 * Intercity and international coach departures from Автобуска станица Прилеп.
 *
 * The web twin of `mojprilep-mobile/src/lib/busStation.ts` — identical logic,
 * so a fix belongs in both. Keep them in sync.
 *
 * ── Where the data comes from ────────────────────────────────────────────────
 * The station's own site (avtobuskaprilep.mk) publishes no timetable at all —
 * every "ВОЗЕН РЕД" link there redirects to pelagonija.mk, the ticketing portal
 * run by Пелагонија БУС, and tells you to begin a purchase to see the times. So
 * pelagonija.mk is the only machine-readable source that exists today, and this
 * module reads the JSON API behind its search form.
 *
 * That API is public but UNDOCUMENTED and belongs to a third party. It can
 * change shape or start refusing us without warning, so every function here
 * fails soft: callers get an empty list, never a crash, and the screen falls
 * back to the station's 24/7 phone number.
 *
 * ── This is a temporary source ───────────────────────────────────────────────
 * The station is sending us the schedule as a spreadsheet. When it arrives the
 * plan is to load it into our own backend and repoint `fetchDepartures` and
 * `fetchStations` at it — which is exactly why the screen talks to this module
 * instead of calling fetch() itself. Only the two functions change; the screen
 * does not.
 */

const API = "https://www.pelagonija.mk/api";

/** Station switchboard — staffed 24/7 for timetable and arrival questions. */
export const STATION_PHONE = "048 400 307";
export const STATION_EMAIL = "avtobuskaprilep@gmail.com";
/** Where a rider actually buys the ticket; the API is read-only. */
export const TICKETS_URL = "https://www.pelagonija.mk/mk";

export type Departure = {
  id: string;
  /** "5:30" — as published, local Prilep time. Not zero-padded upstream. */
  departureTime: string;
  /** Operator running the coach, e.g. "РОМАН ПРИЛЕП". */
  carrierName: string;
  /** Full route, e.g. "Битола - Прилеп - Скопје". */
  routeName: string;
  /** "Меѓуградски" | "Меѓународен". */
  transportType: string;
  /** "Почетна" (starts in Prilep) | "Пролазна" (passes through). */
  lineType: string;
  /** Denars, one way. Empty when the carrier doesn't publish it. */
  singleTicketPrice: string;
  returnTicketPrice: string;
};

/**
 * The API keys its results off the DAY OF WEEK, not the calendar date — the
 * `date` parameter is required but does not narrow the result. These are the
 * exact spellings it accepts; anything else is rejected outright (verified
 * against the live endpoint, which rejects "chetvrtok" and "subota").
 * Indexed by JS `Date.getDay()`, so Sunday first.
 */
const DAY_PARAM = [
  "nedela", "ponedelnik", "vtornik", "sreda", "cetvrtok", "petok", "sabota",
];

/**
 * Which weekday it is *in Prilep*, and the API's date string for it.
 *
 * A phone set to another timezone must not shift the schedule, so the parts
 * come from Intl in Europe/Skopje. Only the timezone shift is taken from Intl —
 * the day NAMES are the table above, because `mk-MK` is missing from some ICU
 * builds and silently falls back to English (same reason as in moviePoll.ts).
 */
export function prilepDay(date: Date = new Date()): { day: string; date: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Skopje",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return {
    day: DAY_PARAM[index] ?? DAY_PARAM[0],
    date: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

async function getJson(url: string): Promise<unknown> {
  // Without a ceiling a stalled request leaves the screen spinning forever;
  // the station's phone number is a better answer than an infinite spinner.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 10000);
  try {
    const res = await fetch(url, { signal: abort.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Every destination served, sorted as the portal returns them. Empty on failure. */
export async function fetchStations(): Promise<string[]> {
  const json = await getJson(`${API}/fetchAllStations`);
  if (!Array.isArray(json)) return [];
  return json
    .map((row) => (row as { stationName?: unknown })?.stationName)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

/**
 * Departures from Prilep to `station` on the given day, earliest first.
 *
 * Upstream returns times as "5:30" / "14:05" — unpadded — so they sort as text
 * incorrectly ("14:05" < "5:30"). Sorting is done on parsed minutes instead.
 */
export async function fetchDepartures(
  station: string,
  when: Date = new Date(),
): Promise<Departure[]> {
  if (!station.trim()) return [];
  const { day, date } = prilepDay(when);
  const url =
    `${API}/fetchTimetable?station=${encodeURIComponent(station)}` +
    `&dayOfWeek=${day}&date=${date}`;

  const json = await getJson(url);
  // A rejected parameter comes back as an object with `error`, not an array.
  if (!Array.isArray(json)) return [];

  return (json as Record<string, unknown>[])
    .map((row) => ({
      id: String(row.id ?? `${row.lineNumber}-${row.departureTime}`),
      departureTime: String(row.departureTime ?? ""),
      carrierName: String(row.carrierName ?? ""),
      routeName: String(row.routeName ?? ""),
      transportType: String(row.transportType ?? ""),
      lineType: String(row.lineType ?? ""),
      singleTicketPrice: String(row.singleTicketPrice ?? ""),
      returnTicketPrice: String(row.returnTicketPrice ?? ""),
    }))
    .filter((d) => d.departureTime)
    .sort((a, b) => toMinutes(a.departureTime) - toMinutes(b.departureTime));
}

/** "5:30" → 330. Returns a large number for junk so it sinks to the bottom. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  const hours = Number(h);
  const mins = Number(m);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return 9999;
  return hours * 60 + mins;
}

/**
 * "5:30" → "05:30", "12:0" → "12:00". Upstream pads inconsistently on BOTH
 * halves — it sends bare "12:0" for a noon departure — so both are padded here.
 * A timetable that shows "12:0" next to "05:30" reads as a typo, and with
 * tabular-nums the columns stop lining up.
 */
export function padTime(time: string): string {
  const [h, m] = time.split(":");
  if (h === undefined || m === undefined) return time;
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

/**
 * Towns that appear as a carrier's HOME TOWN inside its name, not as a stop:
 * the portal sends "ТРАНСКОП - БИТОЛА" and "РОМАН ПРИЛЕП", where the town says
 * who the company is, not where the coach goes. Splitting it out lets the UI
 * show the origin quietly, so the eye lands on the operator.
 *
 * Longest first, so "МАКЕДОНСКИ БРОД" is matched before "БРОД" ever could be.
 */
const CARRIER_ORIGINS: readonly string[] = [
  "МАКЕДОНСКИ БРОД", "КАВАДАРЦИ", "СТРУМИЦА", "КРУШЕВО", "НЕГОТИНО",
  "ГОСТИВАР", "КУМАНОВО", "ПРИЛЕП", "БИТОЛА", "СКОПЈЕ", "КОЧАНИ", "КИЧЕВО",
  "ТЕТОВО", "ОХРИД", "СТРУГА", "ВЕЛЕС", "РЕСЕН", "ДЕБАР", "ШТИП",
];

/**
 * "МАК ТРАВЕЛ" → "Мак Травел". Only shouted names are touched: anything that
 * already carries lowercase letters was cased deliberately upstream and is
 * left exactly as sent.
 */
function titleCase(value: string): string {
  if (value !== value.toLocaleUpperCase("mk")) return value;
  return value
    .toLocaleLowerCase("mk")
    .split(" ")
    .map((w) => w.charAt(0).toLocaleUpperCase("mk") + w.slice(1))
    .join(" ");
}

/**
 * Drops a trailing company form: "ГАЛЕБ АД" → "ГАЛЕБ". Title-cased it would
 * read "Галеб Ад", which looks like a misspelling rather than a legal suffix,
 * and a rider picking a coach does not need the incorporation type.
 */
function stripLegalForm(value: string): string {
  return value.replace(/[\s-]+(АД|ДОО|ДООЕЛ|ТП)$/i, "").trim();
}

/**
 * Splits a carrier name into the company and its home town.
 *
 *   "РОМАН ПРИЛЕП"      → { name: "Роман",    origin: "Прилеп" }
 *   "ТРАНСКОП - БИТОЛА" → { name: "Транскоп", origin: "Битола" }
 *   "ГАЛЕБ"             → { name: "Галеб",    origin: null }
 *
 * The town is only split off when something is left over — a carrier literally
 * named after a town alone keeps its name and gets no origin.
 */
export function splitCarrier(carrierName: string): {
  name: string;
  origin: string | null;
} {
  const clean = carrierName.replace(/ /g, " ").replace(/\s+/g, " ").trim();
  const upper = clean.toLocaleUpperCase("mk");

  for (const town of CARRIER_ORIGINS) {
    if (!upper.endsWith(town)) continue;
    // Drop the town, then the separator that joined it (" - ", "-", or a space).
    const head = stripLegalForm(
      clean.slice(0, clean.length - town.length).replace(/[\s-]+$/, ""),
    );
    if (!head) break; // the whole name was the town — keep it as the name
    return { name: titleCase(head), origin: titleCase(town) };
  }
  return { name: titleCase(stripLegalForm(clean)) || titleCase(clean), origin: null };
}
