import { useEffect, useState } from "react";
import { DISTRICT_LABELS } from "../../lib/utils";
import { companyForCategory } from "../../lib/agencies";
import { ISSUE_STATUS_LABELS } from "../../lib/status";
import { createClient } from "../../lib/supabase/client";
import type {
  Category,
  District,
  IssueStatus,
  IssueStatusLogEntry,
} from "../../lib/types/database";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("mk-MK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_PILL: Record<IssueStatus, string> = {
  open: "bg-red-600 text-white",
  acknowledged: "bg-sky-600 text-white",
  progress: "bg-amber-100 text-amber-700",
  pending: "bg-zinc-200 text-zinc-700",
  resolved: "bg-teal-600 text-white",
};

// Citizen-facing phrasing for each step, parameterised by the institution name.
function stepText(status: IssueStatus, company: string): string {
  switch (status) {
    case "open":
      return `${company} треба да ја преземе пријавата`;
    case "acknowledged":
      return `${company} ја виде вашата пријава`;
    case "progress":
      return `${company} работи на пријавата`;
    case "pending":
      return `${company} ја стави на чекање`;
    case "resolved":
      return `Проблемот е решен од ${company}`;
  }
}

export type StatusTimelineIssue = {
  id: number;
  category: Category;
  status: IssueStatus;
  district: District;
  street_name: string | null;
  created_at: string;
  updated_at?: string | null;
};

export default function StatusTimelinePopup({
  issue,
  onClose,
}: {
  issue: StatusTimelineIssue;
  onClose: () => void;
}) {
  const company = companyForCategory(issue.category);
  const createdAtFull = formatDateTime(issue.created_at);
  const location = [
    DISTRICT_LABELS[issue.district] ?? issue.district,
    issue.street_name,
  ]
    .filter(Boolean)
    .join(" / ");

  // Real, persisted status history (lazy-loaded when the popup opens).
  const [log, setLog] = useState<IssueStatusLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase
      .from("issue_status_log")
      .select("*")
      .eq("issue_id", issue.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        setLog((data as IssueStatusLogEntry[]) ?? []);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [issue.id]);

  return (
    <>
      <div className="fixed inset-0 h-full z-55 bg-black/45" onClick={onClose} />
      <div
        className="fixed inset-0 z-56 flex items-center justify-center p-4"
        onClick={onClose}>
        <div
          className="w-full max-w-150 rounded-xl border border-[#d6dde4] bg-[#f7f9fb] p-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between border-b border-[#d8dee5] pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b96a3]">
              Статус на пријава
            </p>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#7d8793] hover:bg-[#e8edf2]">
              Затвори
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Fixed header: reported + routed to the responsible institution */}
            <div className="grid items-start gap-2 border-b border-dashed border-[#d9dfe6] pb-2.5 lg:grid-cols-[145px_1fr]">
              <p className="pt-0.5 text-[10px] font-semibold text-[#8a97a3]">
                {createdAtFull}
              </p>
              <div className="lg:flex lg:items-center lg:gap-2.5">
                <p className="text-[12px] font-semibold text-[#3f4a56]">
                  Пријавата е испратена
                </p>
                <p className="mt-1 inline-flex rounded-md bg-[#dff2ef] px-2 py-0.5 text-[10px] font-semibold text-[#3b8f86] lg:mt-0">
                  {location}
                </p>
              </div>
            </div>

            <div className="grid items-start gap-2 border-b border-dashed border-[#d9dfe6] pb-2.5 lg:grid-cols-[145px_1fr]">
              <p className="pt-0.5 text-[10px] font-semibold text-[#8a97a3]">
                {createdAtFull}
              </p>
              <div className="lg:flex lg:items-center lg:gap-2.5">
                <p className="text-[12px] font-semibold text-[#3f4a56]">
                  Насочено до надлежна служба
                </p>
                <p className="mt-1 inline-flex rounded-md bg-[#f4e6cf] px-2 py-0.5 text-[10px] font-semibold text-[#c57f1f] lg:mt-0">
                  {company}
                </p>
              </div>
            </div>

            {/* Real status steps */}
            {log.map((entry) => (
              <div
                key={entry.id}
                className="grid items-start gap-2 border-b border-dashed border-[#d9dfe6] pb-2.5 last:border-0 lg:grid-cols-[145px_1fr]">
                <p className="pt-0.5 text-[10px] font-semibold text-[#8a97a3]">
                  {formatDateTime(entry.created_at)}
                </p>
                <div>
                  <div className="lg:flex lg:items-center lg:gap-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_PILL[entry.status] ?? "bg-zinc-200 text-zinc-700"}`}>
                      {ISSUE_STATUS_LABELS[entry.status] ?? entry.status}
                    </span>
                    <p className="mt-1 text-[12px] font-semibold text-[#3f4a56] lg:mt-0">
                      {stepText(entry.status, company)}
                    </p>
                  </div>
                  {entry.note && (
                    <p className="mt-1 text-[12px] text-[#5a6470]">
                      „{entry.note}“
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* No real steps yet → show the current (waiting) state */}
            {loaded && log.length === 0 && (
              <div className="grid items-start gap-2 lg:grid-cols-[145px_1fr]">
                <p className="pt-0.5 text-[10px] font-semibold text-[#8a97a3]">
                  {createdAtFull}
                </p>
                <div className="lg:flex lg:items-center lg:gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/90" />
                    {ISSUE_STATUS_LABELS.open}
                  </span>
                  <p className="mt-1 text-[12px] font-semibold text-[#3f4a56] lg:mt-0">
                    {company} треба да ја преземе пријавата
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
