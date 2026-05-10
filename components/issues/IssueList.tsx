"use client";

import { useState, useSyncExternalStore } from "react";
import { useIssues } from "../../lib/hooks/useIssues";
import { useAuth } from "../../lib/hooks/useAuth";
import IssueCard from "./IssueCard";
import IssueCardSkeleton from "./IssueCardSkeleton";
import IssueDetail from "./IssueDetail";
import FilterSelect from "../ui/FilterSelect";
import {
  DISTRICT_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from "../../lib/utils";

const CATEGORY_ALL_LABEL_SHORT = "Категории";
const STATUS_ALL_LABEL_SHORT = "Статуси";
import type { District, Category, IssueStatus } from "../../lib/types/database";

// 'all' maps to no filter (entire city = Прилеп)
const DISTRICTS: Array<District | "all"> = [
  "all",
  "Center",
  "Varoš",
  "Trizla",
  "Točila",
  "Rid",
  "Tipski",
  "Boncejca",
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

  const { user } = useAuth();
  const { issues, loading, loadingMore, hasMore, error, fetchMore } = useIssues(
    { district, category, status, userId: user?.id },
  );

  return (
    <div className="">
      <div
        suppressHydrationWarning
        className="mt-3 grid grid-cols-3 z-50 gap-1.5 px-2 md:px-0 lg:px-3 py-2 sticky top-0 bg-[#f2f4f7] border-b border-zinc-200 lg:border-b-0"
        style={{ backgroundColor: "#f2f4f7" }}>
        {mounted ? (
          <>
            <FilterSelect
              value={district}
              onChange={(v) => setDistrict(v as District | "all")}
              options={DISTRICTS.map((d) => ({
                value: d,
                label: DISTRICT_LABELS[d] ?? d,
              }))}
            />
            <FilterSelect
              value={category}
              onChange={(v) => setCategory(v as Category | "all")}
              options={[
                { value: "all", label: CATEGORY_ALL_LABEL_SHORT },
                ...(CATEGORIES.filter((c) => c !== "all") as Category[]).map(
                  (c) => ({ value: c, label: CATEGORY_LABELS[c] }),
                ),
              ]}
            />
            <FilterSelect
              value={status}
              onChange={(v) => setStatus(v as IssueStatus | "all")}
              options={[
                { value: "all", label: STATUS_ALL_LABEL_SHORT },
                ...(STATUSES.filter((s) => s !== "all") as IssueStatus[]).map(
                  (s) => ({ value: s, label: STATUS_LABELS[s] }),
                ),
              ]}
            />
          </>
        ) : (
          <>
            <div className="h-8 lg:h-9 rounded-lg border border-zinc-200 bg-white " />
            <div className="h-8 lg:h-9 rounded-lg border border-zinc-200 bg-white " />
            <div className="h-8 lg:h-9 rounded-lg border border-zinc-200 bg-white " />
          </>
        )}
      </div>

      <div className="flex min-h-0 gap-0">
        <div className="w-full space-y-3 overflow-y-auto px-0 lg:px-3 py-3 lg:py-5">
          {loading && (
            <>
              <IssueCardSkeleton />
              <IssueCardSkeleton />
              <IssueCardSkeleton />
            </>
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
                className={`overflow-hidden rounded-none lg:rounded-xl border-y lg:border border-zinc-200 bg-white transition-colors ${
                  selectedId === issue.id ? "lg:border-zinc-400" : ""
                }`}>
                <IssueCard
                  eagerImage={index < 2}
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

          {/* Load more */}
          {!loading && hasMore && (
            <button
              onClick={fetchMore}
              disabled={loadingMore}
              className="w-full rounded-xl border border-[#dce6e2] bg-white py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-zinc-50 disabled:opacity-50">
              {loadingMore ? "Се вчитува…" : "Вчитај повеќе"}
            </button>
          )}
          {loadingMore && (
            <>
              <IssueCardSkeleton />
              <IssueCardSkeleton />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
