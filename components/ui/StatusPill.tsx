import { cn } from "../../lib/utils";
import type { IssueStatus } from "../../lib/types/database";
import {
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_PILL_CLASSES,
} from "../../lib/status";

export default function StatusPill({ status }: { status: IssueStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
        ISSUE_STATUS_PILL_CLASSES[status],
      )}>
      {ISSUE_STATUS_LABELS[status]}
    </span>
  );
}
