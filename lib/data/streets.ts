// Single source of truth for Prilep streets. Components import from here
// instead of touching prilep-streets.json directly so they share one Fuse
// index and one canonical-name normalizer.

import Fuse from "fuse.js";
import data from "./prilep-streets.json";
import type { District } from "../types/database";

export interface Street {
  name: string;            // Canonical (current) Cyrillic name, source casing
  name_lat: string;
  old_name?: string;
  old_name_lat?: string;
  search_terms: string[];
  /** Optional district assignment. When present, picking the street can
   *  auto-fill the district field in the report form. */
  district?: District;
}

export const STREETS = data as Street[];

// One shared Fuse index — built lazily, reused across components.
let _fuse: Fuse<Street> | null = null;
export function getStreetFuse(): Fuse<Street> {
  if (_fuse) return _fuse;
  _fuse = new Fuse(STREETS, {
    keys: ["search_terms"],
    threshold: 0.35,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
    shouldSort: true,
  });
  return _fuse;
}

/**
 * Pretty-format an ALL CAPS source string as title-case Macedonian.
 * Used for display only — never for storage comparisons.
 */
export function prettyStreetName(s: string): string {
  return s
    .toLocaleLowerCase("mk")
    .replace(/(^|[\s.\-/])(\p{L})/gu, (_, sep, ch) =>
      sep + ch.toLocaleUpperCase("mk"),
    );
}

/**
 * Try to normalize an arbitrary street string (from OSM, user input, a
 * pasted address, etc.) to a canonical street from the local database.
 *
 * Strategy:
 *   1. Strip common prefixes ("ул.", "бул.", "ul.", etc.).
 *   2. Strip parentheses and their content ("Илка Василеска (Присаѓанка)").
 *   3. Strip house numbers from the end.
 *   4. If nothing left, try the parts before/after a "-" separator.
 *   5. Run Fuse against the cleaned candidate(s).
 *   6. Require a fuse score below 0.4 to accept (lower = better).
 *
 * Returns the matched Street entry, or null if confidence too low.
 */
export function matchStreet(raw: string): Street | null {
  if (!raw) return null;

  const candidates = generateCandidates(raw);
  const fuse = getStreetFuse();

  let best: { score: number; item: Street } | null = null;
  for (const c of candidates) {
    const results = fuse.search(c, { limit: 1 });
    const top = results[0];
    if (!top || top.score === undefined) continue;
    if (!best || top.score < best.score) {
      best = { score: top.score, item: top.item };
    }
  }

  if (!best) return null;
  if (best.score > 0.4) return null; // too uncertain — don't auto-fill
  return best.item;
}

/**
 * Produces normalized candidate strings to search against the local DB.
 * Different OSM responses for the same street give wildly different forms;
 * we try several shapes to maximize the chance of a clean canonical hit.
 */
function generateCandidates(raw: string): string[] {
  const out = new Set<string>();
  const clean = (s: string): string =>
    s
      .toLocaleLowerCase("mk")
      // strip common Macedonian/Latin street prefixes
      .replace(/^\s*(ул\.|улица|бул\.|булевар|пл\.|плоштад|ul\.|ulica|bul\.)\s*/i, "")
      // collapse whitespace
      .replace(/\s+/g, " ")
      .trim();

  const add = (s: string) => {
    const c = clean(s);
    if (c.length >= 2) out.add(c);
  };

  // 1. Whole string
  add(raw);

  // 2. Strip parentheses content: "Илка Василеска (Присаѓанка)-Божана" → "Илка Василеска -Божана"
  const noParens = raw.replace(/\([^)]*\)/g, " ");
  add(noParens);

  // 3. Use ONLY the contents of parentheses (OSM sometimes puts the current
  //    name there): "(Присаѓанка)" → "Присаѓанка"
  const parenMatches = raw.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    for (const m of parenMatches) add(m.slice(1, -1));
  }

  // 4. Split on "-" (OSM often joins two names) and try each piece
  for (const part of raw.split(/[-–—/]/g)) {
    if (part.trim().length >= 2) add(part);
  }

  // 5. Strip trailing house numbers ("Партизанска 12" → "Партизанска")
  const noNumber = raw.replace(/\s+\d+[a-zа-я]?\s*$/i, "");
  if (noNumber !== raw) add(noNumber);

  return Array.from(out);
}
