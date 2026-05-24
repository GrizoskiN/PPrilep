import { cn } from "../../lib/utils";
import type { IssueStatus } from "../../lib/types/database";

const labels: Record<IssueStatus, string> = {
  open: "Отворено",
  progress: "Во тек",
  resolved: "Решено",
};

export default function StatusPill({ status }: { status: IssueStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
        status === "resolved" && "bg-teal-600 text-white",
        status === "open" && "bg-amber-700 text-white",
        status === "progress" &&
          "bg-amber-50 border border-amber-300 text-amber-700",
      )}>
      {labels[status]}
    </span>
  );
}
