"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { useIssues } from "../../lib/hooks/useIssues";
import { useAuth } from "../../lib/hooks/useAuth";
import IssueCard from "./IssueCard";
import IssueDetail from "./IssueDetail";
import {
  DISTRICT_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from "../../lib/utils";
import type { District, Category, IssueStatus } from "../../lib/types/database";

// 'all' maps to no filter (entire city = Прилеп)
const DISTRICTS: Array<District | "all"> = [
  "all",
  "Center",
  "Varoš",
  "Trizla",
  "Točila",
  "Rid",
  "Tri Bari",
];
const CATEGORIES: Array<Category | "all"> = [
  "all",
  "road",
  "water",
  "power",
  "garbage",
  "park",
  "other",
];
const STATUSES: Array<IssueStatus | "all"> = [
  "all",
  "open",
  "progress",
  "resolved",
];

const CATEGORY_ALL_LABEL = "Сите категории";
const STATUS_ALL_LABEL = "Сите статуси";

export default function IssueList({
  defaultDistrict,
}: {
  defaultDistrict?: District;
  showGreeting?: boolean;
  greetingName?: string;
}) {
  const [district, setDistrict] = useState<District | "all">(
    defaultDistrict ?? "all",
  );
  const [category, setCategory] = useState<Category | "all">("all");
  const [status, setStatus] = useState<IssueStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { issues, loading, error } = useIssues({ district, category, status });
  const { user } = useAuth();

  return (
    <div className="">
      <div
        suppressHydrationWarning
        className="mt-5 grid grid-cols-3  gap-1 lg:gap-2 px-2 lg:px-6 py-2 lg:py-4 sticky top-0 z-10  bg-white ">
        {mounted ? (
          <>
            {/* District: first option is "Прилеп" = all */}
            <div className="relative">
              <select
                suppressHydrationWarning
                value={district}
                onChange={(e) =>
                  setDistrict(e.target.value as District | "all")
                }
                className="w-full appearance-none rounded-xl border border-[#dce6e2] bg-white px-2 py-2.5 pr-10 text-xs lg:text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-[#c7d8d2] focus:border-primary focus:ring-2 focus:ring-primary/15">
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {DISTRICT_LABELS[d] ?? d}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative">
              <select
                suppressHydrationWarning
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as Category | "all")
                }
                className="w-full appearance-none rounded-xl border border-[#dce6e2] bg-white px-2 py-2.5 pr-10 text-xs lg:text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-[#c7d8d2] focus:border-primary focus:ring-2 focus:ring-primary/15">
                <option value="all">{CATEGORY_ALL_LABEL}</option>
                {(CATEGORIES.filter((c) => c !== "all") as Category[]).map(
                  (c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ),
                )}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative">
              <select
                suppressHydrationWarning
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as IssueStatus | "all")
                }
                className="w-full appearance-none rounded-xl border border-[#dce6e2] bg-white px-2 py-2.5 pr-10 text-xs lg:text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-[#c7d8d2] focus:border-primary focus:ring-2 focus:ring-primary/15">
                <option value="all">{STATUS_ALL_LABEL}</option>
                {(STATUSES.filter((s) => s !== "all") as IssueStatus[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ),
                )}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </>
        ) : (
          <>
            <div className="h-10 rounded-xl border border-[#dce6e2] bg-white" />
            <div className="h-10 rounded-xl border border-[#dce6e2] bg-white" />
            <div className="h-10 rounded-xl border border-[#dce6e2] bg-white" />
          </>
        )}
      </div>

      <div className="flex min-h-0 gap-0">
        <div className="w-full space-y-3 overflow-y-auto px-2 lg:px-6 py-5">
          {loading && (
            <p className="text-xs text-zinc-400">Се вчитуваат пријави…</p>
          )}
          {error && (
            <div className="text-xs text-red-600 border border-red-200 rounded p-3 bg-red-50">
              <p className="font-medium">Грешка при вчитување</p>
              <p className="text-red-500 mt-0.5">{error}</p>
            </div>
          )}
          {!loading && !error && issues.length === 0 && (
            <p className="text-xs text-zinc-400">Нема пријавени проблеми.</p>
          )}
          {issues.map((issue, index) => (
            <div key={issue.id} className="space-y-2">
              <div
                className={`overflow-hidden rounded-xl transition-colors shadow-[0_6px_16px_rgba(15,23,42,0.12)] ${
                  selectedId === issue.id
                    ? " shadow-[0_6px_16px_rgba(15,23,42,0.22)]"
                    : "bg-white"
                }`}>
                <IssueCard
                  eagerImage={index === 0}
                  issue={issue}
                  userId={user?.id}
                  embeddedMobile
                  onClick={() =>
                    setSelectedId((prev) =>
                      prev === issue.id ? null : issue.id,
                    )
                  }
                />

                {selectedId === issue.id && (
                  <div className="border-t border-zinc-200/80">
                    <IssueDetail
                      issue={issue}
                      userId={user?.id}
                      variant="engagement"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
