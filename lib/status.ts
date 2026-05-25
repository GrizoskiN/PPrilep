import type { IssueStatus } from "./types/database";

export const ISSUE_STATUSES: IssueStatus[] = ["open", "progress", "resolved"];

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Отворено",
  progress: "Во тек",
  resolved: "Решено",
};

export const ISSUE_STATUS_PILL_CLASSES: Record<IssueStatus, string> = {
  open: "bg-amber-700 text-white",
  progress: "bg-amber-50 border border-amber-300 text-amber-700",
  resolved: "bg-teal-600 text-white",
};

export const ISSUE_STATUS_MENU_TEXT_CLASSES: Record<IssueStatus, string> = {
  open: "text-amber-700",
  progress: "text-amber-700",
  resolved: "text-teal-700",
};
