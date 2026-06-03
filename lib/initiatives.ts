import type {
  InitiativeCategory,
  InitiativeStage,
} from "./types/database";

export const INITIATIVE_TABS = [
  { value: "all", label: "Сите" },
  { value: "idea", label: "Идеи" },
  { value: "voting", label: "На гласање" },
  { value: "funding", label: "Фонд кампањи" },
  { value: "completed", label: "Реализирано" },
] as const;

export type InitiativeTab = (typeof INITIATIVE_TABS)[number]["value"];

export const STAGE_LABEL: Record<InitiativeStage, string> = {
  idea: "Идеја",
  voting: "На гласање",
  funding: "Фонд кампања",
  completed: "Реализирано",
  rejected: "Одбиено",
};

export const STAGE_BADGE: Record<InitiativeStage, string> = {
  idea: "bg-blue-50 text-blue-800",
  voting: "bg-amber-50 text-amber-800",
  funding: "bg-green-50 text-green-800",
  completed: "bg-zinc-100 text-zinc-600",
  rejected: "bg-red-50 text-red-800",
};

export const STAGE_DOT: Record<"idea" | "voting" | "funding" | "completed", string> = {
  idea: "#378ADD",
  voting: "#BA7517",
  funding: "#639922",
  completed: "#888780",
};

export const STAGE_ORDER: ("idea" | "voting" | "funding" | "completed")[] = [
  "idea",
  "voting",
  "funding",
  "completed",
];

export const CATEGORY_LABELS_INIT: Record<InitiativeCategory, string> = {
  infrastructure: "Инфраструктура",
  education: "Образование",
  environment: "Животна средина",
  culture: "Култура",
  safety: "Безбедност",
  health: "Здравство",
  other: "Друго",
};

export function daysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}
