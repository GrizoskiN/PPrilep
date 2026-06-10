import type { IssueStatus } from "./types/database";

export const ISSUE_STATUSES: IssueStatus[] = [
  "open",
  "acknowledged",
  "progress",
  "pending",
  "resolved",
];

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Пријавено",
  acknowledged: "Видено",
  progress: "Се работи",
  pending: "На чекање",
  resolved: "Решено",
};

export const ISSUE_STATUS_PILL_CLASSES: Record<IssueStatus, string> = {
  open: "bg-amber-700 text-white",
  acknowledged: "bg-sky-600 text-white",
  progress: "bg-amber-50 border border-amber-300 text-amber-700",
  pending: "bg-zinc-100 border border-zinc-300 text-zinc-600",
  resolved: "bg-teal-600 text-white",
};

export const ISSUE_STATUS_MENU_TEXT_CLASSES: Record<IssueStatus, string> = {
  open: "text-amber-700",
  acknowledged: "text-sky-700",
  progress: "text-amber-700",
  pending: "text-zinc-600",
  resolved: "text-teal-700",
};
