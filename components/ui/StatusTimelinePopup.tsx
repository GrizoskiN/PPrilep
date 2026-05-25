import { DISTRICT_LABELS } from "../../lib/utils";
import type { Category, District, IssueStatus } from "../../lib/types/database";

const COMPANY_BY_CATEGORY: Record<Category, string> = {
  road: "Општина Прилеп",
  water: "Водовод",
  power: "Осветлување",
  garbage: "Комуналец",
  park: "Паркови и зеленило",
  negligent: "Инспекторат",
  transport: "Градски превоз",
  parking: "Паркинзи",
  admin: "Општинска администрација",
  other: "Надлежна служба",
};

const STATUS_TEXT: Record<IssueStatus, string> = {
  open: "Отворено",
  progress: "Решавање",
  resolved: "Решено",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("mk-MK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type StatusTimelineIssue = {
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
  const company = COMPANY_BY_CATEGORY[issue.category] ?? "Надлежна служба";
  const createdAt = issue.created_at;
  const statusAt = issue.updated_at ?? issue.created_at;
  const location = [
    DISTRICT_LABELS[issue.district] ?? issue.district,
    issue.street_name,
  ]
    .filter(Boolean)
    .join(" / ");
  const createdAtFull = formatDateTime(createdAt);
  const statusAtFull = formatDateTime(statusAt);

  return (
    <>
      <div
        className="fixed inset-0 h-full z-55 bg-black/45"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-56 flex items-center justify-center p-4"
        onClick={onClose}>
        <div
          className="w-full max-w-150 rounded-xl border border-[#d6dde4] bg-[#f7f9fb]  p-4 shadow-2xl"
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
                  Категоријата е утврдена
                </p>
                <p className="mt-1 inline-flex rounded-md bg-[#f4e6cf] px-2 py-0.5 text-[10px] font-semibold text-[#c57f1f] lg:mt-0">
                  {company}
                </p>
              </div>
            </div>

            <div className="grid items-start gap-2 border-b border-dashed border-[#d9dfe6] pb-2.5 lg:grid-cols-[145px_1fr]">
              <p className="pt-0.5 text-[10px] font-semibold text-[#8a97a3]">
                {issue.status === "open" ? createdAtFull : statusAtFull}
              </p>
              <div className="lg:flex lg:items-center lg:gap-2.5">
                {issue.status === "open" ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/90" />
                      {STATUS_TEXT.open}
                    </span>
                    <p className="mt-1 text-[12px] font-semibold text-[#3f4a56] lg:mt-0">
                      {company} треба да ја преземе пријавата
                    </p>
                  </>
                ) : (
                  <>
                    <span className="inline-flex animate-pulse rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      {STATUS_TEXT.progress}
                    </span>
                    <p className="mt-1 text-[12px] font-semibold text-[#3f4a56] lg:mt-0">
                      {company} ја презеде пријавата
                    </p>
                  </>
                )}
              </div>
            </div>

            {(issue.status === "progress" || issue.status === "resolved") && (
              <div className="grid items-start gap-2 bg-[#eefaf8] px-2 py-2 lg:grid-cols-[145px_1fr]">
                <p className="pt-0.5 text-[10px] font-semibold text-[#5c9e98]">
                  + чекор
                </p>
                <div className="lg:flex lg:items-center lg:gap-2.5">
                  <p className="text-[12px] font-semibold text-[#2f5f5b]">
                    Насочено кон редица на {company}
                  </p>
                </div>
              </div>
            )}

            {issue.status === "resolved" && (
              <div className="border-t-2 border-dashed border-teal-300 pt-2.5">
                <div className="grid items-start gap-2 lg:grid-cols-[145px_1fr]">
                  <p className="pt-0.5 text-[10px] font-semibold text-[#8a97a3]">
                    {statusAtFull}
                  </p>
                  <div className="lg:flex lg:items-center lg:gap-2.5">
                    <span className="inline-flex rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      {STATUS_TEXT.resolved}
                    </span>
                    <p className="mt-1 text-[12px] font-semibold text-[#3f4a56] lg:mt-0">
                      Проблемот е затворен од надлежната служба
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
