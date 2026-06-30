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
    phone:       null,
    closingTime: "18:00",
    district:    "Бончејца",
    description: null,
    director:    null,
  },
  {
    slug:        "moja-bajka",
    name:        "Градинка Наша Иднина - Моја Бајка",
    shortName:   "Моја Бајка",
    address:     null,
    phone:       null,
    closingTime: "18:00",
    district:    "Точила",
    description: null,
    director:    null,
  },
  {
    slug:        "trizla",
    name:        "Градинка Наша Иднина - Тризла",
    shortName:   "Тризла",
    address:     null,
    phone:       null,
    closingTime: "18:00",
    district:    "Тризла",
    description: null,
    director:    null,
  },
  {
    slug:        "alicair",
    name:        "Градинка Наша Иднина - Аличаир",
    shortName:   "Аличаир",
    address:     null,
    phone:       null,
    closingTime: "18:00",
    district:    "Аличаир",
    description: null,
    director:    null,
  },
  {
    slug:        "goce-delcev",
    name:        "Градинка Наша Иднина - Гоце Делчев",
    shortName:   "Гоце Делчев",
    address:     null,
    phone:       null,
    closingTime: "18:00",
    district:    "Гоце Делчев",
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
