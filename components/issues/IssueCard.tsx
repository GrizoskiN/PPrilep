"use client";

import { useState, useRef, useEffect } from "react";
import BlurImage from "../ui/BlurImage";
import Link from "next/link";
import { Send, X, Link2 } from "lucide-react";
import StatusPill from "../ui/StatusPill";
import AvatarInitials from "../ui/AvatarInitials";
import {
  formatDays,
  cn,
  DISTRICT_LABELS,
  getIssuePath,
} from "../../lib/utils";
import type { Issue, IssueStatus, Category } from "../../lib/types/database";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const HelperModal = dynamic(() => import("./HelperModal"), { ssr: false });

function IstaMakaIcon({ className }: { className?: string }) {
  return (
    <svg
      width="35"
      height="49"
      viewBox="0 0 35 49"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M31.6967 22.5259C31.437 22.1027 18.8969 1.5043 18.3718 0.667791C17.811 -0.221342 16.509 -0.22525 15.9447 0.671986C14.889 2.36722 2.58627 22.5886 2.58627 22.5886C0.893804 25.3019 0 28.4341 0 31.6487C9.5329e-05 41.1111 7.69734 48.8084 17.1597 48.8084C26.622 48.8084 34.3193 41.1112 34.3193 31.6488C34.3193 28.4105 33.4117 25.2559 31.6967 22.5259ZM17.1597 43.0886C16.3693 43.0886 15.7298 42.449 15.7298 41.6587C15.7298 40.8683 16.3693 40.2287 17.1597 40.2287C21.8909 40.2287 25.7395 36.3801 25.7395 31.6489C25.7395 30.8586 26.379 30.219 27.1694 30.219C27.9598 30.219 28.5994 30.8586 28.5994 31.6489C28.5994 37.9567 23.4688 43.0886 17.1597 43.0886Z"
        fill="currentColor"
      />
    </svg>
  );
}

function KomentariIcon({ className }: { className?: string }) {
  return (
    <svg
      width="55"
      height="48"
      viewBox="0 0 55 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true">
      <path
        d="M32.1406 3.21976C28.7723 1.14232 24.7809 0 20.6578 0C9.43416 0 0 8.36197 0 19.0688C0 22.8226 1.16616 26.4212 3.38131 29.5291L0.286879 39.2442C-0.0400444 40.2704 0.728638 41.3156 1.80126 41.3156C2.0465 41.3156 2.29334 41.259 2.5211 41.1431L11.9317 36.3582C12.3128 36.5223 12.6986 36.6749 13.0884 36.8167C10.9095 33.4159 9.74625 29.5121 9.74625 25.425C9.74625 13.2531 19.9881 3.89553 32.1406 3.21976Z"
        fill="currentColor"
      />
      <path
        d="M50.8591 35.8855C53.0743 32.7776 54.2404 29.179 54.2404 25.4251C54.2404 14.7144 44.8022 6.35632 33.5826 6.35632C22.359 6.35632 12.9248 14.7183 12.9248 25.4251C12.9248 36.1358 22.363 44.4938 33.5826 44.4938C36.593 44.4938 39.5927 43.8803 42.3082 42.7143L51.7193 47.4994C52.2904 47.7898 52.9803 47.7087 53.4686 47.2938C53.9568 46.8788 54.1482 46.2112 53.9537 45.6007L50.8591 35.8855ZM27.1204 27.0141C26.2428 27.0141 25.5314 26.3027 25.5314 25.4251C25.5314 24.5475 26.2428 23.836 27.1204 23.836C27.998 23.836 28.7095 24.5475 28.7095 25.4251C28.7095 26.3027 27.998 27.0141 27.1204 27.0141ZM33.4767 27.0141C32.5991 27.0141 31.8876 26.3027 31.8876 25.4251C31.8876 24.5475 32.5991 23.836 33.4767 23.836C34.3543 23.836 35.0657 24.5475 35.0657 25.4251C35.0657 26.3027 34.3543 27.0141 33.4767 27.0141ZM39.8329 27.0141C38.9553 27.0141 38.2439 26.3027 38.2439 25.4251C38.2439 24.5475 38.9553 23.836 39.8329 23.836C40.7105 23.836 41.422 24.5475 41.422 25.4251C41.422 26.3027 40.7105 27.0141 39.8329 27.0141Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PomogniIcon({ className }: { className?: string }) {
  return (
    <svg
      width="50"
      height="48"
      viewBox="0 0 50 48"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M28 1.30983L27.6266 0.974772C26.003 -0.481681 23.435 -0.252463 22 1.30535L25.0012 4L28 1.30983Z"
        fill="currentColor"
      />
      <path
        d="M49.576 32.1351L46.4281 29C44.2775 31.143 39.6334 35.77 35.9831 39.4042C34.2457 41.1353 32.2348 42.5166 30 43.5172L34.0774 47.5779C34.6426 48.1408 35.5588 48.1407 36.124 47.5776L49.5762 34.1737C50.1413 33.6107 50.1413 32.698 49.576 32.1351Z"
        fill="currentColor"
      />
      <path
        d="M45.9744 25.6748C49.0811 22.3975 44.4512 17.8594 41.1035 20.9029L42.3191 19.709C45.4258 16.4286 40.7966 11.8937 37.4396 14.937L38.6638 13.7432C41.7731 10.4599 37.135 5.92765 33.7844 8.97032L35.0086 7.77732C38.1197 4.49237 33.4749 -0.0371303 30.1291 3.00457L27.3444 5.72967L29.7823 8.11729C33.3551 11.5221 31.4979 17.7049 26.6251 18.677C26.1633 20.9584 24.1155 22.9887 21.7549 23.4475C21.293 25.7332 19.2416 27.7652 16.875 28.2218C15.861 32.9889 9.60033 34.8115 6.08725 31.3015C6.08725 31.3016 3.65104 28.9157 3.65104 28.9157L0.433365 32.0644C-0.144521 32.6299 -0.144422 33.5468 0.433463 34.1123L14.1944 47.5761C14.7723 48.1414 15.7091 48.1413 16.2868 47.5757L21.5944 42.3792C26.2756 42.3792 30.7671 40.5584 34.0775 37.3178C39.1035 32.4016 45.9744 25.6748 45.9744 25.6748Z"
        fill="currentColor"
      />
      <path
        d="M7.64044 29.9682C10.9655 33.0935 15.5598 28.4359 12.4782 25.0675C15.8034 28.1926 20.3975 23.5352 17.3159 20.1667C20.6383 23.293 25.224 18.6283 22.1451 15.2667C25.4658 18.3906 30.0662 13.7376 26.9827 10.3659L19.7347 3.01426C18.3928 1.66191 16.2303 1.66191 14.8971 3.01426C13.5636 4.36662 13.5636 6.56275 14.8971 7.91511L16.1021 9.14009C12.7844 6.01275 8.17779 10.6854 11.273 14.0409L12.4781 15.2667C9.15451 12.1403 4.55843 16.7986 7.64044 20.1667L8.77998 21.3211C5.42347 18.3362 0.970948 22.9733 4.01629 26.2925C4.01639 26.2924 7.64044 29.9682 7.64044 29.9682Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface UserEntry {
  user_id: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

function UserListPopup({
  users,
  onClose,
}: {
  users: UserEntry[];
  onClose: () => void;
}) {
  return (
    <div
      className="absolute bottom-full left-0 mb-2 z-50 bg-white rounded-xl shadow-xl border border-zinc-200 w-52 max-h-56 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100">
        <p className="text-xs font-semibold text-zinc-700">
          {users.length} луѓе
        </p>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <X size={12} />
        </button>
      </div>
      {users.map((u) => {
        const name =
          u.profiles?.full_name ?? u.profiles?.username ?? "Анонимно";
        const href = u.profiles?.username
          ? `/u/${u.profiles.username}`
          : `/u/${u.user_id}`;
        return (
          <Link
            key={u.user_id}
            href={href}
            className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 transition-colors">
            <AvatarInitials
              name={name}
              avatarUrl={u.profiles?.avatar_url ?? null}
              size="sm"
            />
            <span className="text-xs text-zinc-700 truncate">{name}</span>
          </Link>
        );
      })}
    </div>
  );
}

interface Props {
  issue: Issue;
  userId?: string;
  onClick?: () => void;
  eagerImage?: boolean;
  // legacy — kept for callers that still pass it, ignored
  embeddedMobile?: boolean;
  selected?: boolean;
  onAffectedToggle?: (affected: boolean, count: number) => void;
}

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

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString("mk-MK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("mk-MK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusTimelinePopup({
  issue,
  onClose,
}: {
  issue: Issue;
  onClose: () => void;
}) {
  const company = COMPANY_BY_CATEGORY[issue.category] ?? "Надлежна служба";
  const createdAt = issue.created_at;
  const statusAt = issue.updated_at ?? issue.created_at;
  const location = [DISTRICT_LABELS[issue.district] ?? issue.district, issue.street_name]
    .filter(Boolean)
    .join(" / ");
  const createdAtFull = formatDateTime(createdAt);
  const statusAtFull = formatDateTime(statusAt);

  return (
    <>
      <div className="fixed inset-0 z-55 bg-black/45" onClick={onClose} />
      <div className="fixed inset-0 z-56 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="w-full max-w-156 rounded-3xl border border-[#d6dde4] bg-[#f7f9fb] p-4 shadow-2xl"
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
              <p className="pt-0.5 text-[10px] font-semibold text-[#8a97a3]">{createdAtFull}</p>
              <div className="lg:flex lg:items-center lg:gap-2.5">
                <p className="text-[12px] font-semibold text-[#3f4a56]">Пријавата е испратена</p>
                <p className="mt-1 inline-flex rounded-md bg-[#dff2ef] px-2 py-0.5 text-[10px] font-semibold text-[#3b8f86] lg:mt-0">
                  {location}
                </p>
              </div>
            </div>

            <div className="grid items-start gap-2 border-b border-dashed border-[#d9dfe6] pb-2.5 lg:grid-cols-[145px_1fr]">
              <p className="pt-0.5 text-[10px] font-semibold text-[#8a97a3]">{createdAtFull}</p>
              <div className="lg:flex lg:items-center lg:gap-2.5">
                <p className="text-[12px] font-semibold text-[#3f4a56]">Категоријата е утврдена</p>
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
                <p className="pt-0.5 text-[10px] font-semibold text-[#5c9e98]">+ чекор</p>
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
                  <p className="pt-0.5 text-[10px] font-semibold text-[#8a97a3]">{statusAtFull}</p>
                  <div className="lg:flex lg:items-center lg:gap-2.5">
                    <span className="inline-flex rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      {STATUS_TEXT.resolved}
                    </span>
                    <p className="mt-1 text-[12px] font-semibold text-[#3f4a56] lg:mt-0">Проблемот е затворен од надлежната служба</p>
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

export default function IssueCard({
  issue,
  userId,
  onClick,
  eagerImage = false,
}: Props) {
  const [affectedCount, setAffectedCount] = useState(issue.affected_count ?? 0);
  const [helperCount, setHelperCount] = useState(issue.helper_count ?? 0);
  const [isAffected, setIsAffected] = useState(issue.is_affected ?? false);
  const [isHelper, setIsHelper] = useState(issue.is_helper ?? false);

  // Sync local optimistic state with the parent's `issue` prop whenever it
  // changes. Without this, the card stays visually "unliked" after the user
  // toggles, because the parent's updated issue object can't reach our
  // useState (it only runs on mount). Adding this is the proper fix for the
  // remount-on-key approach we removed for perf.
  useEffect(() => {
    const id = setTimeout(() => {
      setAffectedCount(issue.affected_count ?? 0);
      setHelperCount(issue.helper_count ?? 0);
      setIsAffected(issue.is_affected ?? false);
      setIsHelper(issue.is_helper ?? false);
    }, 0);
    return () => clearTimeout(id);
  }, [
    issue.affected_count,
    issue.helper_count,
    issue.is_affected,
    issue.is_helper,
  ]);
  const [helperOpen, setHelperOpen] = useState(false);
  const [loadingAff, setLoadingAff] = useState(false);

  const [affectedUsers, setAffectedUsers] = useState<UserEntry[]>([]);
  const [helperUsers, setHelperUsers] = useState<UserEntry[]>([]);
  const [showAffectedPop, setShowAffectedPop] = useState(false);
  const [showHelperPop, setShowHelperPop] = useState(false);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [sharePos, setSharePos] = useState({ top: 0, right: 0 });
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  const issuePath = getIssuePath(issue.id, issue.title);
  const authorHref = issue.profiles?.username
    ? `/u/${issue.profiles.username}`
    : issue.profiles?.id
      ? `/u/${issue.profiles.id}`
      : "#";

  function redirectToAuth() {
    if (typeof window === "undefined") return;
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isLocal) {
      toast.info("Најавете се за да продолжите");
      return;
    }
    const next = `${location.pathname}${location.search}`;
    location.href = `/auth/login?next=${encodeURIComponent(next)}`;
  }

  function openShareSheet() {
    if (shareButtonRef.current) {
      const r = shareButtonRef.current.getBoundingClientRect();
      setSharePos({ top: r.bottom + 8, right: window.innerWidth - r.right - 15 });
    }
    setShareSheetOpen(true);
  }

  function closeShareSheet() {
    setShareSheetOpen(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(`${location.origin}${issuePath}`);
    toast.success("Линкот е копиран!");
    closeShareSheet();
  }

  function shareInstagram() {
    navigator.clipboard.writeText(`${location.origin}${issuePath}`);
    toast.message("Линкот е копиран — залепи го во Instagram порака или bio.");
    closeShareSheet();
  }

  async function toggleAffected(e: React.MouseEvent) {
    e.stopPropagation();
    if (!userId) {
      redirectToAuth();
      return;
    }
    if (loadingAff) return;
    setLoadingAff(true);
    const { createClient } = await import("../../lib/supabase/client");
    const supabase = createClient();
    if (isAffected) {
      await supabase
        .from("issue_affected")
        .delete()
        .eq("issue_id", issue.id)
        .eq("user_id", userId);
      const { count } = await supabase
        .from("issue_affected")
        .select("*", { count: "exact", head: true })
        .eq("issue_id", issue.id);
      setIsAffected(false);
      setAffectedCount(count ?? 0);
    } else {
      await supabase
        .from("issue_affected")
        .insert({ issue_id: issue.id, user_id: userId });
      const { count } = await supabase
        .from("issue_affected")
        .select("*", { count: "exact", head: true })
        .eq("issue_id", issue.id);
      setIsAffected(true);
      setAffectedCount(count ?? 0);
      toast.success("Означени сте како засегнати");
    }
    setLoadingAff(false);
  }

  function openHelper(e: React.MouseEvent) {
    e.stopPropagation();
    if (!userId) {
      redirectToAuth();
      return;
    }
    setHelperOpen(true);
  }

  async function showHelpers(e: React.MouseEvent) {
    e.stopPropagation();
    if (helperCount === 0) return;
    const { createClient } = await import("../../lib/supabase/client");
    const supabase = createClient();
    const { data } = await supabase
      .from("issue_helpers")
      .select("user_id, profiles:user_id(full_name, avatar_url, username)")
      .eq("issue_id", issue.id);
    setHelperUsers(
      (data ?? []).map((r) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
      })) as UserEntry[],
    );
    setShowHelperPop(true);
    setShowAffectedPop(false);
  }

  async function showAffected(e: React.MouseEvent) {
    e.stopPropagation();
    if (affectedCount === 0) return;
    const { createClient } = await import("../../lib/supabase/client");
    const supabase = createClient();
    const { data } = await supabase
      .from("issue_affected")
      .select("user_id, profiles:user_id(full_name, avatar_url, username)")
      .eq("issue_id", issue.id);
    setAffectedUsers(
      (data ?? []).map((r) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
      })) as UserEntry[],
    );
    setShowAffectedPop(true);
    setShowHelperPop(false);
  }

  const hasPhoto = !!(issue.photo_url || issue.after_photo_url);

  return (
    <>
      {(showAffectedPop || showHelperPop) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowAffectedPop(false);
            setShowHelperPop(false);
          }}
        />
      )}

      <article
        onClick={onClick}
        className="cursor-pointer bg-white border border-zinc-200 rounded-none lg:rounded-xl overflow-hidden hover:border-zinc-300 transition-colors">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Link
            href={authorHref}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 group min-w-0">
            <AvatarInitials
              name={issue.profiles?.full_name}
              avatarUrl={issue.profiles?.avatar_url}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-800 group-hover:underline leading-tight truncate">
                {issue.profiles?.full_name ?? "Анонимно"}
              </p>
              <p className="text-[11px] text-zinc-400 leading-tight">
                {formatDays(issue.created_at)}
              </p>
            </div>
          </Link>

          <div className="shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusPopup(true);
              }}
              className="rounded-lg p-0.5 transition-colors hover:bg-zinc-100"
              aria-label="Прикажи статус детали">
              <span className="inline-flex items-center gap-1.5">
                {issue.status === "open" && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                )}
                <StatusPill status={issue.status} />
              </span>
            </button>
          </div>
        </div>

        {/* ── Image ──────────────────────────────────────── */}
        {hasPhoto &&
          (issue.photo_url && issue.after_photo_url ? (
            <div className="grid grid-cols-2">
              <div className="relative">
                <BlurImage
                  src={issue.photo_url}
                  alt="Пред"
                  width={1200}
                  height={900}
                  loading={eagerImage ? "eager" : "lazy"}
                  priority={eagerImage}
                  sizes="50vw"
                  rounded="rounded-none"
                  className="h-96 w-full object-cover"
                />
                <span className="absolute top-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Пред
                </span>
              </div>
              <div className="relative">
                <BlurImage
                  src={issue.after_photo_url}
                  alt="Потоа"
                  width={1200}
                  height={900}
                  loading={eagerImage ? "eager" : "lazy"}
                  priority={eagerImage}
                  sizes="50vw"
                  rounded="rounded-none"
                  className="h-96 w-full object-cover"
                />
                <span className="absolute top-1.5 left-1.5 rounded-md bg-teal-600/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Потоа
                </span>
                {issue.resolver && (
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1.5 rounded-lg bg-black/65 backdrop-blur-sm px-2 py-1">
                    <span className="text-xs">🏆</span>
                    <AvatarInitials
                      name={
                        issue.resolver.full_name ??
                        issue.resolver.username ??
                        ""
                      }
                      avatarUrl={issue.resolver.avatar_url}
                      size="sm"
                      className="w-4! h-4! text-[8px]!"
                    />
                    <span className="text-[10px] font-semibold text-white truncate">
                      {issue.resolver.full_name ??
                        issue.resolver.username ??
                        "Херој"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <BlurImage
              src={(issue.photo_url ?? issue.after_photo_url)!}
              alt="Фотографија"
              width={1600}
              height={900}
              loading={eagerImage ? "eager" : "lazy"}
              priority={eagerImage}
              sizes="(max-width: 768px) 100vw, 640px"
              rounded="rounded-none"
              className="h-106.75 w-full object-cover"
            />
          ))}

        {/* ── Title ──────────────────────────────────────── */}
        <div className={cn("px-4", hasPhoto ? "pt-3 pb-1" : "pt-2 pb-1")}>
          <p className="text-sm font-semibold text-zinc-800 line-clamp-2 leading-snug">
            {issue.title}
          </p>
        </div>

        {/* ── Action bar ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-1.5 pb-4">
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Иста мака */}
            <div className="relative flex items-center gap-1.5 lg:gap-2">
              <button
                onClick={showAffected}
                className={cn(
                  "text-[11px] lg:text-sm font-bold tabular-nums transition-colors",
                  affectedCount > 0
                    ? "text-zinc-700 hover:text-[#427FFF] cursor-pointer"
                    : "text-zinc-400 cursor-default",
                )}>
                {affectedCount}
              </button>
              <button
                onClick={toggleAffected}
                disabled={loadingAff}
                className={cn(
                  "flex items-center gap-1 lg:gap-1.5 text-[10px] lg:text-sm font-medium transition-colors",
                  isAffected
                    ? "text-[#427FFF]"
                    : "text-zinc-500 hover:text-[#427FFF]",
                )}>
                <IstaMakaIcon className="h-5 w-5 lg:h-4.5 lg:w-4.5" />
                <span>Иста мака</span>
              </button>
              {showAffectedPop && affectedUsers.length > 0 && (
                <UserListPopup
                  users={affectedUsers}
                  onClose={() => setShowAffectedPop(false)}
                />
              )}
            </div>

            {/* Помогни */}
            <div className="relative flex items-center gap-1.5 lg:gap-2">
              <button
                onClick={showHelpers}
                className={cn(
                  "text-[11px] lg:text-sm font-bold tabular-nums transition-colors",
                  helperCount > 0
                    ? "text-zinc-700 hover:text-[#427FFF] cursor-pointer"
                    : "text-zinc-400 cursor-default",
                )}>
                {helperCount}
              </button>
              <button
                onClick={openHelper}
                className={cn(
                  "flex items-center gap-1 lg:gap-1.5 text-[10px] lg:text-sm font-medium transition-colors",
                  isHelper
                    ? "text-[#427FFF]"
                    : "text-zinc-500 hover:text-[#427FFF]",
                )}>
                <PomogniIcon className="h-5 w-5 lg:h-4.5 lg:w-4.5" />
                <span>Помогни</span>
              </button>
              {showHelperPop && helperUsers.length > 0 && (
                <UserListPopup
                  users={helperUsers}
                  onClose={() => setShowHelperPop(false)}
                />
              )}
            </div>

            {/* Коментари */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className="flex items-center gap-1 lg:gap-1.5 text-[10px] lg:text-sm font-medium text-zinc-500 hover:text-[#427FFF] transition-colors">
              <span
                className={cn(
                  "text-[11px] lg:text-sm font-bold tabular-nums",
                  (issue.comment_count ?? 0) > 0
                    ? "text-zinc-700"
                    : "text-zinc-400",
                )}>
                {issue.comment_count ?? 0}
              </span>
              <KomentariIcon className="h-5 w-5 lg:h-4.5 lg:w-4.5" />
              <span>Коментари</span>
            </button>
          </div>

          {/* Сподели */}
          <div className="relative">
            <button
              ref={shareButtonRef}
              onClick={(e) => { e.stopPropagation(); openShareSheet(); }}
              className="flex items-center gap-1.5 text-[10px] lg:text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors">
              <Send size={14} className="lg:w-4.5 lg:h-4.5" />
              <span className="hidden lg:inline">Сподели</span>
            </button>

            {shareSheetOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => { e.stopPropagation(); closeShareSheet(); }}
                />
                <div
                  className="fixed z-50 w-48 overflow-hidden rounded-xl bg-white shadow-lg"
                  style={{ top: sharePos.top, right: sharePos.right }}
                  onClick={(e) => e.stopPropagation()}>
                  {[
                    {
                      label: "Копирај линк",
                      icon: <Link2 size={15} />,
                      href: null as string | null,
                      action: copyLink,
                    },
                    {
                      label: "Facebook",
                      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.75 h-3.75"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>,
                      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}${issuePath}` : issuePath)}`,
                      action: null as (() => void) | null,
                    },
                    {
                      label: "Instagram",
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.75 h-3.75"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" /></svg>,
                      href: null,
                      action: shareInstagram,
                    },
                    {
                      label: "WhatsApp",
                      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.75 h-3.75"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
                      href: `https://wa.me/?text=${encodeURIComponent(`${issue.title} ${typeof window !== "undefined" ? `${window.location.origin}${issuePath}` : issuePath}`)}`,
                      action: null,
                    },
                    {
                      label: "Viber",
                      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.75 h-3.75"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.07-1.35A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 14.5c-.28 0-.53-.11-.71-.29l-2-2a1 1 0 0 1 0-1.42l.5-.5c.2-.2.2-.51 0-.71l-2-2a.5.5 0 0 0-.71 0l-.5.5C7.08 11.08 7 12 7 12c0 2.76 2.24 5 5 5 0 0 .92-.08 1.92-1.08l.5-.5c.2-.2.2-.51 0-.71l-2-2a.5.5 0 0 0-.71 0l-.5.5c-.2.2-.51.2-.71 0z" /></svg>,
                      href: `viber://forward?text=${encodeURIComponent(`${issue.title} ${typeof window !== "undefined" ? `${window.location.origin}${issuePath}` : issuePath}`)}`,
                      action: null,
                    },
                  ].map((item) =>
                    item.href ? (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={closeShareSheet}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-700 lg:hover:bg-zinc-50 transition-colors">
                        <span className="text-zinc-400">{item.icon}</span>
                        {item.label}
                      </a>
                    ) : (
                      <button
                        key={item.label}
                        onClick={item.action ?? closeShareSheet}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-700 lg:hover:bg-zinc-50 transition-colors">
                        <span className="text-zinc-400">{item.icon}</span>
                        {item.label}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </article>

      {helperOpen && userId && (
        <HelperModal
          issueId={issue.id}
          issueTitle={issue.title}
          userId={userId}
          onClose={() => setHelperOpen(false)}
          onSuccess={(count) => {
            setIsHelper(true);
            setHelperCount(count);
            setHelperOpen(false);
          }}
        />
      )}

      {showStatusPopup && (
        <StatusTimelinePopup
          issue={issue}
          onClose={() => setShowStatusPopup(false)}
        />
      )}
    </>
  );
}
