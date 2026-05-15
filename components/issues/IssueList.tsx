"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useIssues } from "../../lib/hooks/useIssues";
import { useAuth } from "../../lib/hooks/useAuth";
import IssueCard from "./IssueCard";
import IssueCardSkeleton from "./IssueCardSkeleton";
import IssueDetail from "./IssueDetail";
import FilterSelect from "../ui/FilterSelect";
import ImageLightbox from "../ui/ImageLightbox";
import BeforeAfterSlider from "../ui/BeforeAfterSlider";
import { X } from "lucide-react";
import {
  DISTRICT_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from "../../lib/utils";
import type { District, Category, IssueStatus, Issue } from "../../lib/types/database";

const CATEGORY_ALL_LABEL_SHORT = "Категории";
const STATUS_ALL_LABEL_SHORT = "Статуси";

const DISTRICTS: Array<District | "all"> = [
  "all", "Center", "Varoš", "Trizla", "Točila", "Rid", "Tipski", "Boncejca",
];
const CATEGORIES: Array<Category | "all"> = [
  "all", "road", "water", "power", "garbage", "park", "negligent",
  "transport", "parking", "admin", "other",
];
const STATUSES: Array<IssueStatus | "all"> = ["all", "open", "progress", "resolved"];

export default function IssueList({ defaultDistrict }: { defaultDistrict?: District; showGreeting?: boolean; greetingName?: string }) {
  const [district, setDistrict] = useState<District | "all">(defaultDistrict ?? "all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [status, setStatus] = useState<IssueStatus | "all">("all");
  const [modalIssue, setModalIssue] = useState<Issue | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const { user } = useAuth();
  const { issues, loading, loadingMore, hasMore, error, fetchMore } = useIssues(
    { district, category, status, userId: user?.id },
  );

  // Slide-in animation trigger
  useEffect(() => {
    if (modalIssue) {
      const raf = requestAnimationFrame(() => setModalVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setModalVisible(false);
    }
  }, [modalIssue]);


  // Close modal on Escape
  useEffect(() => {
    if (!modalIssue) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setModalIssue(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalIssue]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = modalIssue ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalIssue]);

  return (
    <>
      <div>
        <div
          suppressHydrationWarning
          className="mt-3 grid grid-cols-3 z-20 gap-1.5 px-2 md:px-0 lg:px-3 py-2 sticky top-0 bg-[#f2f4f7] border-b border-zinc-200 lg:border-b-0"
          style={{ backgroundColor: "#f2f4f7" }}>
          {mounted ? (
            <>
              <FilterSelect
                value={district}
                onChange={(v) => setDistrict(v as District | "all")}
                options={DISTRICTS.map((d) => ({ value: d, label: DISTRICT_LABELS[d] ?? d }))}
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
              <div className="h-8 lg:h-9 rounded-lg border border-zinc-200 bg-white" />
              <div className="h-8 lg:h-9 rounded-lg border border-zinc-200 bg-white" />
              <div className="h-8 lg:h-9 rounded-lg border border-zinc-200 bg-white" />
            </>
          )}
        </div>

        <div className="w-full space-y-3 px-0 lg:px-3 py-3 lg:py-5">
          {loading && <><IssueCardSkeleton /><IssueCardSkeleton /><IssueCardSkeleton /></>}
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
            <IssueCard
              key={issue.id}
              eagerImage={index < 2}
              issue={issue}
              userId={user?.id}
              onClick={() => setModalIssue(issue)}
            />
          ))}

          {!loading && hasMore && (
            <button
              onClick={fetchMore}
              disabled={loadingMore}
              className="w-full rounded-xl border border-[#dce6e2] bg-white py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-zinc-50 disabled:opacity-50">
              {loadingMore ? "Се вчитува…" : "Вчитај повеќе"}
            </button>
          )}
          {loadingMore && <><IssueCardSkeleton /><IssueCardSkeleton /></>}
        </div>
      </div>

      {/* ── Issue modal overlay ─────────────────────────── */}
      {modalIssue && (
        <>
          {/* Desktop: Facebook-style two-panel */}
          <div
            className="hidden lg:flex fixed inset-0 z-50"
            style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
            onClick={() => setModalIssue(null)}>

            {/* Left: black bg — clicking the bg area closes modal */}
            <div className="flex-1 flex items-center justify-center p-8 min-w-0 bg-black">
              {modalIssue.photo_url && modalIssue.after_photo_url ? (
                /* Before/after: embedded interactive slider */
                <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
                  <BeforeAfterSlider
                    beforeSrc={modalIssue.photo_url}
                    afterSrc={modalIssue.after_photo_url}
                    alt={modalIssue.title}
                    maxHeight="85vh"
                    showLabels
                  />
                </div>
              ) : (modalIssue.photo_url || modalIssue.after_photo_url) ? (
                /* Single photo: click to open lightbox */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(modalIssue.photo_url ?? modalIssue.after_photo_url)!}
                  alt="Фотографија"
                  className="max-w-full max-h-[90vh] object-contain rounded-xl cursor-zoom-in"
                  onClick={(e) => { e.stopPropagation(); setLightboxSrc((modalIssue!.photo_url ?? modalIssue!.after_photo_url)!); }}
                />
              ) : (
                <div className="text-zinc-600 text-sm">Нема фотографија</div>
              )}
            </div>

            {/* Right: flex-col panel — sticky header with X, scrollable content below */}
            <div
              className="w-[420px] shrink-0 bg-white flex flex-col"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-end px-4 py-3 border-b border-zinc-100 shrink-0">
                <button
                  onClick={() => setModalIssue(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                <IssueDetail issue={modalIssue} userId={user?.id} hideImage />
              </div>
            </div>
          </div>

          {/* Mobile: full-width slide-in from right */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-out"
            style={{ transform: modalVisible ? "translateX(0)" : "translateX(100%)" }}>
            <div className="flex items-center justify-end px-4 py-3 border-b border-zinc-100 shrink-0">
              <button
                onClick={() => setModalIssue(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <IssueDetail issue={modalIssue} userId={user?.id} />
            </div>
          </div>

          {lightboxSrc && (
            <ImageLightbox
              src={lightboxSrc}
              alt={modalIssue.title}
              beforeSrc={modalIssue.photo_url}
              afterSrc={modalIssue.after_photo_url ?? null}
              onClose={() => setLightboxSrc(null)}
            />
          )}
        </>
      )}
    </>
  );
}
