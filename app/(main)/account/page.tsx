"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function AccountPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [helperActivity, setHelperActivity] = useState<HelperActivity[]>([]);
  const [affectedActivity, setAffectedActivity] = useState<AffectedActivity[]>(
    [],
  );
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login?next=/account");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const id = setTimeout(() => {
      setFullName(profile?.full_name ?? "");
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

      const [issuesRes, helpersRes, affectedRes] = await Promise.all([
        supabase
          .from("issues")
          .select("*")
          .eq("reported_by", userId)
          .order("created_at", { ascending: false })
          .limit(30),
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

      if (issuesRes.error || helpersRes.error || affectedRes.error) {
        toast.error("Не успеа вчитување на профил активност");
      }

      setMyIssues((issuesRes.data as Issue[] | null) ?? []);
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

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(data.path);

      setAvatarUrl(publicUrl);
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
    const safeFullName = fullName.trim() || null;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: safeFullName,
      username: safeUsername,
      avatar_url: avatarUrl,
    });

    if (!error) {
      await supabase.auth.updateUser({ data: { full_name: safeFullName } });
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
        <div className="px-6 py-6 text-sm text-slate-500">
          Се вчитува профил…
        </div>
    );
  }

  return (
      <div className="mx-auto w-full max-w-4xl px-6 py-6">
        <section className="rounded-3xl border border-[#e4ece8] bg-white p-5">
          <h1 className="text-lg font-semibold text-slate-900">Мој профил</h1>
          <p className="mt-1 text-sm text-slate-500">
            Уреди профил, постави слика и следи ја твојата активност.
          </p>

          <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-start">
            <div className="flex flex-col items-start gap-3">
              {avatarUrl ? (
                <Image
                  src={cdnUrl(avatarUrl)}
                  alt="Профил слика"
                  width={92}
                  height={92}
                  sizes="92px"
                  className="h-23 w-23 rounded-2xl border border-[#dce6e2] object-cover"
                />
              ) : (
                <AvatarInitials
                  name={fullName || profile?.full_name || profile?.username}
                  avatarUrl={null}
                  size="md"
                />
              )}

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce6e2] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
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

            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">
                  Целосно име
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dce6e2] px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Внеси име"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Корисничко име
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dce6e2] px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Е-пошта
                </label>
                <input
                  value={user?.email ?? ""}
                  disabled
                  className="mt-1 w-full rounded-xl border border-[#dce6e2] bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={saveProfile}
                  disabled={saving}
                  variant="teal"
                  size="sm">
                  {saving ? "Се зачувува..." : "Зачувај профил"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-[#e4ece8] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Мои пријави
            </h2>
            <span className="rounded-lg bg-[#eef8f5] px-2 py-1 text-xs font-semibold text-primary">
              {myIssues.length}
            </span>
          </div>

          {loadingData ? (
            <p className="text-sm text-slate-500">Се вчитуваат пријави…</p>
          ) : myIssues.length === 0 ? (
            <p className="text-sm text-slate-500">Сè уште немаш пријави.</p>
          ) : (
            <div className="space-y-2">
              {myIssues.map((issue) => (
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
            </div>
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-[#e4ece8] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Моја активност
            </h2>
            <span className="rounded-lg bg-[#eef2f7] px-2 py-1 text-xs font-semibold text-slate-700">
              {helperActivity.length + affectedActivity.length}
            </span>
          </div>

          {loadingData ? (
            <p className="text-sm text-slate-500">Се вчитува активност…</p>
          ) : helperActivity.length + affectedActivity.length === 0 ? (
            <p className="text-sm text-slate-500">Сè уште немаш активности.</p>
          ) : (
            <div className="space-y-2">
              {helperActivity.map((item) => (
                <Link
                  key={`helper-${item.issue_id}`}
                  href={getIssuePath(
                    item.issue_id,
                    item.issues?.title ?? `issue-${item.issue_id}`,
                  )}
                  className="block rounded-2xl border border-[#d9f0e9] bg-[#f6fdfb] px-3 py-2 hover:border-[#bfe3db]">
                  <p className="text-sm font-semibold text-slate-800">
                    Помош: {item.issues?.title ?? `Пријава #${item.issue_id}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.note?.trim()
                      ? `Порака: ${item.note}`
                      : "Се пријавивте како помошник/чка"}
                  </p>
                </Link>
              ))}

              {affectedActivity.map((item) => (
                <Link
                  key={`affected-${item.issue_id}`}
                  href={getIssuePath(
                    item.issue_id,
                    item.issues?.title ?? `issue-${item.issue_id}`,
                  )}
                  className="block rounded-2xl border border-[#e3e8f3] bg-[#f8faff] px-3 py-2 hover:border-[#cfd7ea]">
                  <p className="text-sm font-semibold text-slate-800">
                    Засегнат/а:{" "}
                    {item.issues?.title ?? `Пријава #${item.issue_id}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Означено како засегнат/а
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
  );
}
