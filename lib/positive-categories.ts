/** Canonical category list used in the story submission form, filters, and Sanity schema. */
export const POSITIVE_CATEGORIES = [
  { value: "infrastructure",  label: "Инфраструктура" },
  { value: "education",       label: "Образование" },
  { value: "culture",         label: "Култура" },
  { value: "sport",           label: "Спорт" },
  { value: "environment",     label: "Животна средина" },
  { value: "health",          label: "Здравство" },
  { value: "business",        label: "Бизнис" },
  { value: "community",       label: "Заедница" },
] as const;

export type PositiveCategory = typeof POSITIVE_CATEGORIES[number]["value"];

export function categoryLabel(value: string): string {
  return POSITIVE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
