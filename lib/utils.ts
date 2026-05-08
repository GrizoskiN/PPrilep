import type { District, Category } from "./types/database";

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDays(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86_400_000,
  );
  if (diff === 0) return "денес";
  if (diff === 1) return "пред 1 ден";
  return `пред ${diff} дена`;
}

export function dayCount(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export function districtColor(district: District | string): string {
  const map: Record<string, string> = {
    Center: "bg-zinc-900 text-white",
    Varoš: "bg-zinc-700 text-white",
    Trizla: "bg-zinc-600 text-white",
    Točila: "bg-zinc-500 text-white",
    Rid: "bg-zinc-400 text-black",
    "Tri Bari": "bg-zinc-300 text-black",
  };
  return map[district] ?? "bg-zinc-200 text-black";
}

export const DISTRICT_LABELS: Record<string, string> = {
  all: "Прилеп",
  Center: "Центар",
  Varoš: "Варош",
  Trizla: "Тризла",
  Točila: "Точила",
  Rid: "Рид",
  "Tri Bari": "Три Бари",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  road: "Патишта",
  water: "Вода",
  power: "Струја",
  garbage: "Ѓубре",
  park: "Парк",
  violation: "Срамна листа",
  other: "Друго",
};

export const STATUS_LABELS: Record<string, string> = {
  open: "Отворено",
  progress: "Во тек",
  resolved: "Решено",
};

export function categoryLabel(cat: Category): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

export function categoryIcon(cat: Category): string {
  const map: Record<Category, string> = {
    road: "🚧",
    water: "💧",
    power: "⚡",
    garbage: "🗑️",
    park: "🌳",
    violation: "😡",
    other: "📋",
  };
  return map[cat] ?? "📋";
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ѓ: "gj",
  е: "e",
  ж: "zh",
  з: "z",
  ѕ: "dz",
  и: "i",
  ј: "j",
  к: "k",
  л: "l",
  љ: "lj",
  м: "m",
  н: "n",
  њ: "nj",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  ќ: "kj",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  џ: "dj",
  ш: "sh",
};

function transliterateToLatin(text: string): string {
  return text
    .split("")
    .map((char) => {
      const mapped = CYRILLIC_TO_LATIN[char.toLowerCase()];
      return mapped ?? char;
    })
    .join("");
}

export function slugify(text: string): string {
  return transliterateToLatin(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function getIssuePath(id: number, title: string): string {
  const titleSlug = slugify(title);
  const slugPart = titleSlug || "issue";
  return `/issues/${slugPart}-${id}`;
}

export function parseIssueIdFromSegment(segment: string): number | null {
  if (/^\d+$/.test(segment)) return Number(segment);
  const match = segment.match(/-(\d+)$/);
  if (!match) return null;
  return Number(match[1]);
}
