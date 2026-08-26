/**
 * Server-side sanitising for the repeating sport rows (распоред, ценовник) and
 * the small scalars around them.
 *
 * Extracted so /api/sport/submit and /api/sport/club cannot drift: a club that
 * fills the form once and edits it a month later must get the same validation
 * both times, or the edit silently changes the shape of its own data.
 *
 * Rows that fail validation are DROPPED, not rejected — a club that typed one
 * malformed time should still get the rest of its schedule saved rather than a
 * form error it cannot interpret. Callers check for an empty result.
 */

// Must match sanity/schemas/sport/sportClub.ts.
export const KINDS = new Set(["club", "federation", "gym", "centre", "school", "recreation"]);
export const AGE_GROUPS = new Set(["4-6", "7-11", "12-15", "16-18", "18+", "recreation", "veterans"]);
export const LEVELS = new Set(["beginner", "advanced", "competitive", "recreational"]);
export const GENDERS = new Set(["mixed", "male", "female"]);
export const PERIODS = new Set(["month", "year", "session", "once"]);
export const DAYS = new Set(["0", "1", "2", "3", "4", "5", "6"]);
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const MAX_FIELD = 200;
export const MAX_ROWS = 30;
export const MAX_SPORTS = 10;
export const MAX_PRICE = 1_000_000;

type Row = Record<string, unknown>;

export const text = (v: unknown, max = MAX_FIELD): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export function parseRows(raw: string | null): unknown[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ROWS) : [];
  } catch {
    return [];
  }
}

export function cleanSchedule(rows: unknown[]) {
  return rows
    .filter((r): r is Row => typeof r === "object" && r !== null)
    .map((r) => ({
      _type: "trainingSlot",
      _key: crypto.randomUUID(),
      group: text(r.group),
      days: Array.isArray(r.days)
        ? [...new Set(r.days.map(String).filter((d) => DAYS.has(d)))]
        : [],
      startTime: text(r.startTime, 5),
      endTime: text(r.endTime, 5) || undefined,
      venue: text(r.venue) || undefined,
    }))
    .filter((r) => r.group && r.days.length > 0 && TIME_RE.test(r.startTime))
    .map((r) => ({
      ...r,
      endTime: r.endTime && TIME_RE.test(r.endTime) ? r.endTime : undefined,
    }));
}

export function cleanPricing(rows: unknown[]) {
  return rows
    .filter((r): r is Row => typeof r === "object" && r !== null)
    .map((r) => ({
      _type: "priceItem",
      _key: crypto.randomUUID(),
      label: text(r.label),
      price: Number(r.price),
      period: PERIODS.has(String(r.period)) ? String(r.period) : "month",
      note: text(r.note) || undefined,
    }))
    .filter(
      (r) =>
        r.label && Number.isFinite(r.price) && r.price >= 0 && r.price <= MAX_PRICE,
    );
}

/** A URL we would put in an href — anything not http(s) is dropped, not stored. */
export function cleanUrl(raw: string | null | undefined): string | undefined {
  const value = raw?.trim().slice(0, 500);
  if (!value) return undefined;
  try {
    const parsed = new URL(value.includes("://") ? value : `https://${value}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/** "фудбал, футсал" → ["фудбал", "футсал"], lowercased and capped. */
export function cleanSports(raw: string | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLocaleLowerCase("mk").slice(0, 40))
    .filter(Boolean)
    .slice(0, MAX_SPORTS);
}

/** Keeps only the values the schema knows about. */
export function cleanEnumList(raw: string | null, allowed: Set<string>): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => allowed.has(s));
}
