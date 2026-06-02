"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../../../lib/hooks/useAuth";
import { createClient } from "../../../lib/supabase/client";
import {
  DISTRICT_LABELS,
  STATUS_LABELS,
  formatDays,
  getIssuePath,
  cdnUrl,
} from "../../../lib/utils";
import AvatarInitials from "../../../components/ui/AvatarInitials";
import Button from "../../../components/ui/Button";
import { toast } from "sonner";
import { MoreVertical } from "lucide-react";
import type { Issue } from "../../../lib/types/database";

type HelperActivity = {
  issue_id: number;
  note: string | null;
  issues: Pick<
    Issue,
    "id" | "title" | "district" | "status" | "created_at"
  > | null;
};

type AffectedActivity = {
  issue_id: number;
  issues: Pick<
    Issue,
    "id" | "title" | "district" | "status" | "created_at"
  > | null;
};

type MyInitiative = {
  id: string;
  title: string;
  stage: string;
  district: string | null;
  created_at: string;
};

type ActivityFeedItem = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  tone: "helper" | "affected";
};

type AccountTab = "reports" | "initiatives" | "activity";

const INITIATIVE_STAGE_LABELS: Record<string, string> = {
  idea: "Идеја",
  voting: "Гласање",
  funding: "Финансирање",
  completed: "Завршено",
  rejected: "Одбиено",
};

const LIST_PAGE_SIZE = 7;

export default function AccountPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sensitiveMenuOpen, setSensitiveMenuOpen] = useState(false);
  const sensitiveMenuRef = useRef<HTMLDivElement>(null);

  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [myInitiatives, setMyInitiatives] = useState<MyInitiative[]>([]);
  const [helperActivity, setHelperActivity] = useState<HelperActivity[]>([]);
  const [affectedActivity, setAffectedActivity] = useState<AffectedActivity[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<AccountTab>("reports");
  const [primaryDistrict, setPrimaryDistrict] = useState("all");
  const [notificationSettings, setNotificationSettings] = useState({
    issueStatus: true,
    neighborhoodInitiatives: true,
    utilityUrgent: false,
  });
  const [visibleByTab, setVisibleByTab] = useState<Record<AccountTab, number>>({
    reports: LIST_PAGE_SIZE,
    initiatives: LIST_PAGE_SIZE,
    activity: LIST_PAGE_SIZE,
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login?next=/account");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const id = setTimeout(() => {
      setUsername(profile?.username ?? "");
      setAvatarUrl(profile?.avatar_url ?? null);
    }, 0);
    return () => clearTimeout(id);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let mounted = true;

    async function loadProfileData() {
      setLoadingData(true);
      const [issuesRes, initiativesRes, helpersRes, affectedRes] =
        await Promise.all([
          supabase
            .from("issues")
            .select("*")
            .eq("reported_by", userId)
            .order("created_at", { ascending: false })
            .limit(30),
          supabase
            .from("initiatives")
            .select("id, title, stage, district, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("issue_helpers")
            .select(
              "issue_id, note, issues(id, title, district, status, created_at)",
            )
            .eq("user_id", userId),
          supabase
            .from("issue_affected")
            .select("issue_id, issues(id, title, district, status, created_at)")
            .eq("user_id", userId),
        ]);

      if (!mounted) return;

      if (
        issuesRes.error ||
        helpersRes.error ||
        affectedRes.error ||
        initiativesRes.error
      ) {
        toast.error("Не успеа вчитување на профил активност");
      }

      setMyIssues((issuesRes.data as Issue[] | null) ?? []);
      setMyInitiatives((initiativesRes.data as MyInitiative[] | null) ?? []);
      setHelperActivity((helpersRes.data as HelperActivity[] | null) ?? []);
      setAffectedActivity(
        (affectedRes.data as AffectedActivity[] | null) ?? [],
      );
      setLoadingData(false);
    }

    loadProfileData();

    return () => {
      mounted = false;
    };
  }, [supabase, user]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        sensitiveMenuRef.current &&
        !sensitiveMenuRef.current.contains(e.target as Node)
      ) {
        setSensitiveMenuOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setSensitiveMenuOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const districtKey = `account_primary_district_${user.id}`;
    const settingsKey = `account_notification_settings_${user.id}`;

    const hydrationId = setTimeout(() => {
      const savedDistrict = localStorage.getItem(districtKey);
      if (savedDistrict) setPrimaryDistrict(savedDistrict);

      const rawSettings = localStorage.getItem(settingsKey);
      if (rawSettings) {
        try {
          setNotificationSettings(JSON.parse(rawSettings));
        } catch {
          // Ignore invalid local setting payload.
        }
      }
    }, 0);

    return () => clearTimeout(hydrationId);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const districtKey = `account_primary_district_${user.id}`;
    const settingsKey = `account_notification_settings_${user.id}`;
    localStorage.setItem(districtKey, primaryDistrict);
    localStorage.setItem(settingsKey, JSON.stringify(notificationSettings));

    window.dispatchEvent(
      new CustomEvent("account-settings-changed", {
        detail: { primaryDistrict },
      }),
    );
  }, [notificationSettings, primaryDistrict, user]);

  async function uploadAvatar(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Избери слика (jpg/png/webp)");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Сликата е преголема (макс 8MB)");
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const buckets = ["avatars", "issue-photos"] as const;
    let lastError: string | null = null;

    for (const bucket of buckets) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { contentType: file.type, upsert: true });

      if (error) {
        lastError = error.message;
        continue;
      }

      const publicUrlResult = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      setAvatarUrl(publicUrlResult.data.publicUrl);
      toast.success("Сликата е поставена");
      setUploadingAvatar(false);
      return;
    }

    toast.error(
      lastError
        ? `Неуспешно прикачување: ${lastError}`
        : "Неуспешно прикачување на слика",
    );
    setUploadingAvatar(false);
  }

  async function saveProfile() {
    if (!user) return;

    setSaving(true);
    const safeUsername = username.trim() || null;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: safeUsername,
      avatar_url: avatarUrl,
    });

    if (!error) {
      toast.success("Профилот е зачуван");
      setSaving(false);
      router.refresh();
      return;
    }

    if (error.code === "23505") {
      toast.error("Ова корисничко име веќе постои");
    } else {
      toast.error(error.message);
    }

    setSaving(false);
  }

  if (loading || (!user && !profile)) {
    return (
      <div className="px-6 py-6 text-sm text-theme-muted">
        Се вчитува профил…
      </div>
    );
  }

  const identityName = profile?.full_name?.trim() || profile?.username || "Мој профил";
  const identityHandle = username?.trim() || profile?.username || "корисник";
  const activityTotal = helperActivity.length + affectedActivity.length;

  const activityFeedItems: ActivityFeedItem[] = [
    ...helperActivity.map((item) => ({
      key: `helper-${item.issue_id}`,
      href: getIssuePath(
        item.issue_id,
        item.issues?.title ?? `issue-${item.issue_id}`,
      ),
      title: `Помош: ${item.issues?.title ?? `Пријава #${item.issue_id}`}`,
      subtitle: item.note?.trim()
        ? `Порака: ${item.note}`
        : "Се пријавивте како помошник/чка",
      tone: "helper" as const,
    })),
    ...affectedActivity.map((item) => ({
      key: `affected-${item.issue_id}`,
      href: getIssuePath(
        item.issue_id,
        item.issues?.title ?? `issue-${item.issue_id}`,
      ),
      title: `Засегнат/а: ${item.issues?.title ?? `Пријава #${item.issue_id}`}`,
      subtitle: "Означено како засегнат/а",
      tone: "affected" as const,
    })),
  ];

  const visibleReports = myIssues.slice(0, visibleByTab.reports);
  const visibleInitiatives = myInitiatives.slice(0, visibleByTab.initiatives);
  const visibleActivity = activityFeedItems.slice(0, visibleByTab.activity);

  function showMore(tab: AccountTab) {
    setVisibleByTab((prev) => ({ ...prev, [tab]: prev[tab] + LIST_PAGE_SIZE }));
  }

  return (
    <div className="w-full">
      <section className="pb-3">
        <div className="relative" ref={sensitiveMenuRef}>
          {/* Edit (dots) button — absolute top-right */}
          <button
            type="button"
            onClick={() => setSensitiveMenuOpen((o) => !o)}
            aria-label="Уреди профил"
            aria-expanded={sensitiveMenuOpen}
            className="absolute right-0 top-0 rounded-xl border border-theme bg-white p-2 text-theme-muted transition-colors hover:border-[#cfdad4] hover:text-theme-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9e1e8]">
            <MoreVertical size={16} />
          </button>

          {/* Centered identity */}
          <div className="flex flex-col items-center gap-2 pt-2 text-center">
            {avatarUrl ? (
              <Image
                src={cdnUrl(avatarUrl)}
                alt="Профил слика"
                width={96}
                height={96}
                sizes="96px"
                className="h-24 w-24 rounded-full border border-[#dce6e2] object-cover"
              />
            ) : (
              <AvatarInitials
                name={username || profile?.username}
                avatarUrl={null}
                size="lg"
              />
            )}

            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-theme-heading">
                {identityName}
              </h1>
              <p className="truncate text-sm text-theme-muted">@{identityHandle}</p>
              {user?.email && (
                <p className="mt-0.5 truncate text-xs text-theme-subtle">{user.email}</p>
              )}
            </div>
          </div>

          {sensitiveMenuOpen && (
            <div className="absolute right-0 top-6 z-20 mt-2 max-h-[76vh] w-[min(19rem,88vw)] overflow-y-auto rounded-2xl border border-theme bg-theme-surface p-3 shadow-lg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-theme-subtle">
                Уреди профил
              </p>

              <div className="mt-2.5 space-y-2.5">
                <div className="flex flex-col items-start gap-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Профилна слика
                  </label>
                  <label className="mt-1 inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-[#dce6e2] px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
                    {uploadingAvatar ? "Се прикачува..." : "Додади слика"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingAvatar}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAvatar(file);
                      }}
                    />
                  </label>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">
                    Корисничко име
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#dce6e2] px-2.5 py-2 text-xs outline-none focus:border-primary"
                    placeholder="username"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">
                    Примарна населба
                  </label>
                  <select
                    value={primaryDistrict}
                    onChange={(e) => setPrimaryDistrict(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#dce6e2] bg-white px-2.5 py-2 text-xs outline-none focus:border-primary">
                    <option value="all">Прилеп (општо)</option>
                    <option value="Center">Центар</option>
                    <option value="Točila">Точила</option>
                    <option value="Varoš">Варош</option>
                    <option value="Trizla">Тризла</option>
                    <option value="Rid">Рид</option>
                    <option value="Tipski">Типски</option>
                    <option value="Boncejca">Бончејца</option>
                    <option value="KorzoMaalo">Корзо Маало</option>
                  </select>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Известувања
                  </p>
                  <div className="mt-1.5 space-y-1.5 text-xs text-theme-body">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={notificationSettings.issueStatus}
                        onChange={(e) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            issueStatus: e.target.checked,
                          }))
                        }
                      />
                      Статус на мои пријави
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={notificationSettings.neighborhoodInitiatives}
                        onChange={(e) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            neighborhoodInitiatives: e.target.checked,
                          }))
                        }
                      />
                      Нови иницијативи во населба
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={notificationSettings.utilityUrgent}
                        onChange={(e) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            utilityUrgent: e.target.checked,
                          }))
                        }
                      />
                      Ургентни известувања од претпријатија
                    </label>
                  </div>
                </div>

                <div className="rounded-lg border border-[#e6edf5] p-2.5">
                  <p className="text-[11px] font-semibold text-slate-700">
                    Безбедност
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Промена на лозинка и поврзани профили наскоро.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSensitiveMenuOpen(false)}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-theme-muted hover:text-theme-heading">
                    Затвори
                  </button>
                  <Button
                    onClick={saveProfile}
                    disabled={saving}
                    variant="teal"
                    size="sm">
                    {saving ? "Се зачувува..." : "Зачувај"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-[#e4ece8] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[#edf2f0] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "reports"
                ? "border-[#cde7df] text-theme-accent"
                : "border-[#e4ece8] text-theme-muted hover:text-theme-heading"
            }`}>
            Мои пријави ({myIssues.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("initiatives")}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "initiatives"
                ? "border-[#cde7df] text-theme-accent"
                : "border-[#e4ece8] text-theme-muted hover:text-theme-heading"
            }`}>
            Иницијативи ({myInitiatives.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "activity"
                ? "border-[#cde7df] text-theme-accent"
                : "border-[#e4ece8] text-theme-muted hover:text-theme-heading"
            }`}>
            Моја активност ({activityTotal})
          </button>
        </div>

        {loadingData ? (
          <p className="text-sm text-slate-500">Се вчитуваат податоци…</p>
        ) : activeTab === "reports" ? (
          myIssues.length === 0 ? (
            <p className="text-sm text-slate-500">Сè уште немаш пријави.</p>
          ) : (
            <div className="space-y-2">
              {visibleReports.map((issue) => (
                <Link
                  key={issue.id}
                  href={getIssuePath(issue.id, issue.title)}
                  className="block rounded-2xl border border-[#e4ece8] px-3 py-2 hover:border-[#cfe0da]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {issue.title}
                    </p>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDays(issue.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {DISTRICT_LABELS[issue.district] ?? issue.district} •{" "}
                    {STATUS_LABELS[issue.status] ?? issue.status}
                  </p>
                </Link>
              ))}

              {myIssues.length > visibleReports.length && (
                <button
                  type="button"
                  onClick={() => showMore("reports")}
                  className="w-full rounded-xl border border-[#dce6e2] bg-white py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-zinc-50">
                  Види повеќе
                </button>
              )}
            </div>
          )
        ) : activeTab === "initiatives" ? (
          myInitiatives.length === 0 ? (
            <p className="text-sm text-slate-500">Сè уште немаш иницијативи.</p>
          ) : (
            <div className="space-y-2">
              {visibleInitiatives.map((initiative) => (
                <div
                  key={initiative.id}
                  className="rounded-2xl border border-[#e4ece8] px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {initiative.title}
                    </p>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDays(initiative.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {INITIATIVE_STAGE_LABELS[initiative.stage] ??
                      initiative.stage}
                    {initiative.district
                      ? ` • ${DISTRICT_LABELS[initiative.district] ?? initiative.district}`
                      : ""}
                  </p>
                </div>
              ))}

              {myInitiatives.length > visibleInitiatives.length && (
                <button
                  type="button"
                  onClick={() => showMore("initiatives")}
                  className="w-full rounded-xl border border-[#dce6e2] bg-white py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-zinc-50">
                  Види повеќе
                </button>
              )}
            </div>
          )
        ) : activityTotal === 0 ? (
          <p className="text-sm text-slate-500">Сè уште немаш активности.</p>
        ) : (
          <div className="space-y-2">
            {visibleActivity.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`block rounded-2xl border px-3 py-2 ${
                  item.tone === "helper"
                    ? "border-[#d9f0e9] hover:border-[#bfe3db]"
                    : "border-[#e3e8f3] hover:border-[#cfd7ea]"
                }`}>
                <p className="text-sm font-semibold text-slate-800">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{item.subtitle}</p>
              </Link>
            ))}

            {activityFeedItems.length > visibleActivity.length && (
              <button
                type="button"
                onClick={() => showMore("activity")}
                className="w-full rounded-xl border border-[#dce6e2] bg-white py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-zinc-50">
                Види повеќе
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
