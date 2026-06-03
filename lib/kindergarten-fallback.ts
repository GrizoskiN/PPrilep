/**
 * Hardcoded institution data — used until Sanity is populated.
 * Merged with Sanity data when available (Sanity wins).
 */

export interface InstitutionFallback {
  slug:        string;
  name:        string;
  shortName:   string;
  address:     string | null;
  phone:       string | null;
  closingTime: string | null;
  district:    string | null;
  description: string | null;
  director:    string | null;
  lat?:        number | null;
  lng?:        number | null;
}

export const INSTITUTION_FALLBACK: InstitutionFallback[] = [
  {
    slug:        "bonchejca",
    name:        "Градинка Наша Иднина - Бончејца",
    shortName:   "Бончејца",
    address:     "Киро Нацески-Феток 1",
    phone:       "048 424 076",
    closingTime: "18:00",
    district:    "Бончејца",
    description: null,
    director:    null,
  },
  {
    slug:        "mirche-acev",
    name:        "Градинка Наша Иднина - Мирче Ацев",
    shortName:   "Мирче Ацев",
    address:     null,
    phone:       "048 421 996",
    closingTime: "17:00",
    district:    "Центар",
    description: null,
    director:    null,
  },
  {
    slug:        "trizla",
    name:        "Градинка Наша Иднина - Тризла",
    shortName:   "Тризла",
    address:     null,
    phone:       "075 235 689",
    closingTime: "18:00",
    district:    "Тризла",
    description: null,
    director:    null,
  },
  {
    slug:        "rabotnicki",
    name:        "Градинка Наша Иднина - Работнички",
    shortName:   "Работнички",
    address:     null,
    phone:       null,
    closingTime: "18:00",
    district:    "Работнички",
    description: null,
    director:    null,
  },
];

export function getFallbackBySlug(slug: string): InstitutionFallback | undefined {
  return INSTITUTION_FALLBACK.find((i) => i.slug === slug);
}
