/**
 * Taxi companies operating in Prilep, with the short codes people dial.
 *
 * The web twin of `mojprilep-mobile/src/lib/taxi.ts` — same shape, same list.
 * Kept as a plain module rather than fetched: it is a handful of entries that
 * change once or twice a year, and the page has to be instant and work from
 * cache. When the list starts churning, move it to Sanity alongside the other
 * editorial content and keep this array as the fallback.
 *
 * KEEP THE TWO FILES IN SYNC — a number fixed here and not there means half the
 * users still dial the wrong one.
 */

export type TaxiCompany = {
  name: string;
  /**
   * The short code (e.g. "1596"), which is what people actually dial in Prilep.
   * A string — leading digits matter and it is never arithmetic. Not every
   * company has one — the smaller firms are reached on a plain mobile number,
   * and then `phone` is the only way to call them.
   */
  shortCode?: string;
  /** Full landline/mobile, for anyone dialling from outside the local network. */
  phone?: string;
  /** Optional note, e.g. "24 часа" or "и комби превоз". */
  note?: string;
};

/**
 * Confirmed by the site owner on 2026-08-26: these two are the taxi companies
 * actually operating in Prilep. An earlier draft carried eight more scraped from
 * the zk.mk directory — they were stale and have been removed. Do not re-add
 * entries from a directory without someone local confirming the number first: a
 * wrong taxi number in a civic app is worse than a short list, because someone
 * dials it at 2am and reaches a stranger.
 */
export const TAXI_COMPANIES: TaxiCompany[] = [
  { name: "Такси Прилеп", shortCode: "13131" },
  { name: "Такси Пет", shortCode: "13777" },
];
