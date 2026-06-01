"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useAuth } from "../../lib/hooks/useAuth";
import { createClient } from "../../lib/supabase/client";
import { DISTRICT_LABELS, formatDays, getIssuePath } from "../../lib/utils";
import type { Issue } from "../../lib/types/database";

type RightPanelIssue = Pick<
  Issue,
  "id" | "title" | "district" | "status" | "created_at"
>;

export default function AccountRightPanel() {
  const { user, profile, signOut } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [primaryDistrict, setPrimaryDistrict] = useState("all");
  const [myIssuesCount, setMyIssuesCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [helperCount, setHelperCount] = useState(0);
  const [latestOpenIssues, setLatestOpenIssues] = useState<RightPanelIssue[]>(
    [],
  );
  const [latestResolvedIssues, setLatestResolvedIssues] = useState<
    RightPanelIssue[]
  >([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingDistrictFeed, setLoadingDistrictFeed] = useState(true);

  useEffect(() => {
    if (!user) return;

    const key = `account_primary_district_${user.id}`;
    const applyFromStorage = () => {
      const saved = localStorage.getItem(key);
      setPrimaryDistrict(saved || "all");
    };

    const hydrationId = setTimeout(applyFromStorage, 0);

    const handleSettingsChanged = (event: Event) => {
      const custom = event as CustomEvent<{ primaryDistrict?: string }>;
      if (custom.detail?.primaryDistrict) {
        setPrimaryDistrict(custom.detail.primaryDistrict);
        return;
      }
      applyFromStorage();
    };

    window.addEventListener(
      "account-settings-changed",
      handleSettingsChanged as EventListener,
    );

    return () => {
      clearTimeout(hydrationId);
      window.removeEventListener(
        "account-settings-changed",
        handleSettingsChanged as EventListener,
      );
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;

    let mounted = true;

    async function loadStats() {
      setLoadingStats(true);

      const [reportedRes, helperRes] = await Promise.all([
        supabase
          .from("issues")
          .select("status", { count: "exact" })
          .eq("reported_by", uid)
          .limit(200),
        supabase
          .from("issue_helpers")
          .select("issue_id", { count: "exact", head: true })
          .eq("user_id", uid),
      ]);

      if (!mounted) return;

      const reported =
        (reportedRes.data as Array<{ status: string }> | null) ?? [];
      setMyIssuesCount(reported.length);
      setResolvedCount(
        reported.filter((item) => item.status === "resolved").length,
      );
      setHelperCount(helperRes.count ?? 0);
      setLoadingStats(false);
    }

    loadStats();

    return () => {
      mounted = false;
    };
  }, [supabase, user]);

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    const hasDistrictFilter =
      primaryDistrict !== "all" &&
      Object.hasOwn(DISTRICT_LABELS, primaryDistrict);

    async function loadDistrictIssueFeed() {
      setLoadingDistrictFeed(true);

      const openQuery = supabase
        .from("issues")
        .select("id, title, district, status, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(2);

      const resolvedQuery = supabase
        .from("issues")
        .select("id, title, district, status, created_at")
        .eq("status", "resolved")
        .order("created_at", { ascending: false })
        .limit(2);

      const [openRes, resolvedRes] = await Promise.all([
        hasDistrictFilter
          ? openQuery.eq("district", primaryDistrict)
          : openQuery,
        hasDistrictFilter
          ? resolvedQuery.eq("district", primaryDistrict)
          : resolvedQuery,
      ]);

      if (!mounted) return;

      setLatestOpenIssues((openRes.data as RightPanelIssue[] | null) ?? []);
      setLatestResolvedIssues(
        (resolvedRes.data as RightPanelIssue[] | null) ?? [],
      );
      setLoadingDistrictFeed(false);
    }

    loadDistrictIssueFeed();

    return () => {
      mounted = false;
    };
  }, [primaryDistrict, supabase, user]);

  const districtFeedLabel =
    primaryDistrict !== "all" && Object.hasOwn(DISTRICT_LABELS, primaryDistrict)
      ? DISTRICT_LABELS[primaryDistrict]
      : "Сите населби";

  return (
    <div className="space-y-4 p-3 -mt-4 lg:mt-0">
      <section className="rounded-2xl border border-[#e4ece8] bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-theme-subtle">
          Микро статистика
        </p>
        {loadingStats ? (
          <p className="mt-2 text-xs text-theme-muted">Се вчитува…</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[#e4ece8] bg-white px-2 py-2 text-center">
              <p className="text-base font-semibold text-theme-heading">
                {myIssuesCount}
              </p>
              <p className="text-[10px] text-theme-muted">Пријави</p>
            </div>
            <div className="rounded-xl border border-[#e4ece8] bg-white px-2 py-2 text-center">
              <p className="text-base font-semibold text-theme-heading">
                {resolvedCount}
              </p>
              <p className="text-[10px] text-theme-muted">Решени</p>
            </div>
            <div className="rounded-xl border border-[#e4ece8] bg-white px-2 py-2 text-center">
              <p className="text-base font-semibold text-theme-heading">
                {helperCount}
              </p>
              <p className="text-[10px] text-theme-muted">Помош</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#e4ece8] bg-white p-3">
        <p className="text-sm font-semibold text-theme-heading">
          {profile?.membership_tier ?? "Активен граѓанин"}
        </p>
        <p className="mt-1 text-xs text-theme-muted">
          Поени: {profile?.points ?? 0}
        </p>
        <p className="mt-1 text-xs text-theme-muted">
          Примарна населба: {DISTRICT_LABELS[primaryDistrict] ?? "Прилеп"}
        </p>
      </section>

      <section className="rounded-2xl border border-[#e4ece8] bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-theme-subtle">
          Локални пријави
        </p>
        <p className="mt-1 text-xs text-theme-muted">{districtFeedLabel}</p>

        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-700">Отворени</p>
          {loadingDistrictFeed ? (
            <p className="mt-1 text-xs text-theme-muted">Се вчитува…</p>
          ) : latestOpenIssues.length === 0 ? (
            <p className="mt-1 text-xs text-theme-muted">
              Нема отворени пријави.
            </p>
          ) : (
            <div className="mt-1.5 space-y-1.5">
              {latestOpenIssues.map((issue) => (
                <Link
                  key={`open-${issue.id}`}
                  href={getIssuePath(issue.id, issue.title)}
                  className="block rounded-lg border border-[#f0d8d0] px-2.5 py-2 hover:border-[#e9c8bd]">
                  <p className="line-clamp-1 text-xs font-semibold text-slate-800">
                    {issue.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {DISTRICT_LABELS[issue.district] ?? issue.district} •{" "}
                    {formatDays(issue.created_at)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-700">Решени</p>
          {loadingDistrictFeed ? (
            <p className="mt-1 text-xs text-theme-muted">Се вчитува…</p>
          ) : latestResolvedIssues.length === 0 ? (
            <p className="mt-1 text-xs text-theme-muted">
              Нема решени пријави.
            </p>
          ) : (
            <div className="mt-1.5 space-y-1.5">
              {latestResolvedIssues.map((issue) => (
                <Link
                  key={`resolved-${issue.id}`}
                  href={getIssuePath(issue.id, issue.title)}
                  className="block rounded-lg border border-[#d9ebe2] px-2.5 py-2 hover:border-[#c7e2d4]">
                  <p className="line-clamp-1 text-xs font-semibold text-slate-800">
                    {issue.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {DISTRICT_LABELS[issue.district] ?? issue.district} •{" "}
                    {formatDays(issue.created_at)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Logout — mobile only (desktop logs out via the navbar menu) */}
      <button
        type="button"
        onClick={() => signOut()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 lg:hidden">
        <LogOut size={16} />
        Одјави се
      </button>
    </div>
  );
}
