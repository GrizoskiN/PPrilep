import type { Category } from "./types/database";

/**
 * Single source of truth for the institution ↔ category mapping. Mirrors the DB
 * tables `agencies` / `agency_categories` (supabase/add_agencies.sql). UI labels
 * and routing both derive from here so they never drift.
 */
export type AgencyId =
  | "vodovod"
  | "komunalec"
  | "osvetluvanje"
  | "transport_parking"
  | "municipality";

export interface Agency {
  id: AgencyId;
  name: string;
  sort: number;
}

export const AGENCIES: Record<AgencyId, Agency> = {
  vodovod: { id: "vodovod", name: "Водовод", sort: 1 },
  komunalec: { id: "komunalec", name: "Комуналец", sort: 2 },
  osvetluvanje: { id: "osvetluvanje", name: "Јавно осветлување", sort: 3 },
  transport_parking: {
    id: "transport_parking",
    name: "Јавен превоз и паркинзи",
    sort: 4,
  },
  municipality: { id: "municipality", name: "Општина Прилеп", sort: 5 },
};

export const AGENCY_LIST: Agency[] = Object.values(AGENCIES).sort(
  (a, b) => a.sort - b.sort,
);

/** Which agency handles each issue category. */
export const AGENCY_BY_CATEGORY: Record<Category, AgencyId> = {
  water: "vodovod",
  garbage: "komunalec",
  park: "komunalec",
  power: "osvetluvanje",
  transport: "transport_parking",
  parking: "transport_parking",
  road: "municipality",
  negligent: "municipality",
  admin: "municipality",
  other: "municipality",
};

/** Display name of the institution responsible for a category. */
export function companyForCategory(category: Category): string {
  return AGENCIES[AGENCY_BY_CATEGORY[category]].name;
}

/** Does the given agency handle the given category? */
export function agencyHandlesCategory(
  agencyId: string | null | undefined,
  category: Category,
): boolean {
  if (!agencyId) return false;
  return AGENCY_BY_CATEGORY[category] === agencyId;
}
