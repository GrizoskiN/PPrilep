"use client";

import { useState } from "react";
import BlurImage from "../ui/BlurImage";
import Link from "next/link";
import { Send, X, Link2, Mail } from "lucide-react";
import StatusPill from "../ui/StatusPill";
import AvatarInitials from "../ui/AvatarInitials";
import {
  formatDays,
  categoryIcon,
  cn,
  DISTRICT_LABELS,
  CATEGORY_LABELS,
  getIssuePath,
} from "../../lib/utils";
import type { Issue } from "../../lib/types/database";
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
  const [helperOpen, setHelperOpen] = useState(false);
  const [loadingAff, setLoadingAff] = useState(false);

  const [affectedUsers, setAffectedUsers] = useState<UserEntry[]>([]);
  const [helperUsers, setHelperUsers] = useState<UserEntry[]>([]);
  const [showAffectedPop, setShowAffectedPop] = useState(false);
  const [showHelperPop, setShowHelperPop] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);

  const issuePath = getIssuePath(issue.id, issue.title);
  const authorHref = issue.profiles?.username
    ? `/u/${issue.profiles.username}`
    : issue.profiles?.id
      ? `/u/${issue.profiles.id}`
      : "#";

  function redirectToAuth() {
    const next = `${location.pathname}${location.search}`;
    location.href = `/auth/login?next=${encodeURIComponent(next)}`;
  }

  function openShareSheet(e: React.MouseEvent) {
    e.stopPropagation();
    setShareSheetOpen(true);
  }

  function copyLink(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(`${location.origin}${issuePath}`);
    toast.success("Линкот е копиран!");
    setShareSheetOpen(false);
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
    if (isHelper) return;
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

          {/* Desktop: original row layout, district+street truncated with gradient */}
          <div className="hidden lg:flex items-center gap-1.5 justify-end shrink-0 max-w-[60%] min-w-0">
            <div className="relative min-w-0 overflow-hidden">
              <span className="text-[10px] text-zinc-500 font-medium whitespace-nowrap block">
                {DISTRICT_LABELS[issue.district] ?? issue.district}
                {issue.street_name ? ` | ${issue.street_name}` : ""}
              </span>
              <div className="absolute inset-y-0 right-0 w-8 bg-linear-to-l from-white to-transparent pointer-events-none" />
            </div>
            <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap shrink-0">
              {categoryIcon(issue.category)}{" "}
              {CATEGORY_LABELS[issue.category] ?? issue.category}
            </span>
            <StatusPill status={issue.status} />
          </div>

          {/* Mobile: category+status on top, street below with gradient */}
          <div className="lg:hidden flex flex-col items-end gap-0.5 shrink-0 max-w-[60%]">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/issues?category=${issue.category}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap hover:bg-zinc-200 transition-colors">
                {categoryIcon(issue.category)}{" "}
                {CATEGORY_LABELS[issue.category] ?? issue.category}
              </Link>
              <StatusPill status={issue.status} />
            </div>
            {issue.street_name && (
              <div className="relative w-full overflow-hidden">
                <Link
                  href={`/issues?street=${encodeURIComponent(issue.street_name)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block text-[10px] text-zinc-400 font-medium whitespace-nowrap hover:text-zinc-600 transition-colors text-right pl-6">
                  {issue.street_name}
                </Link>
                <div className="absolute inset-y-0 left-0 w-8 bg-linear-to-r from-white to-transparent pointer-events-none" />
              </div>
            )}
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
              className="h-[427px] w-full object-cover"
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
                <PomogniIcon className="h-5 w-5 lg:h-[18px] lg:w-[18px]" />
                <span>Помогни</span>
              </button>
              {showHelperPop && helperUsers.length > 0 && (
                <UserListPopup
                  users={helperUsers}
                  onClose={() => setShowHelperPop(false)}
                />
              )}
            </div>

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
                <IstaMakaIcon className="h-5 w-5 lg:h-[18px] lg:w-[18px]" />
                <span>Иста мака</span>
              </button>
              {showAffectedPop && affectedUsers.length > 0 && (
                <UserListPopup
                  users={affectedUsers}
                  onClose={() => setShowAffectedPop(false)}
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
              <KomentariIcon className="h-5 w-5 lg:h-[18px] lg:w-[18px]" />
              <span>Коментари</span>
            </button>
          </div>

          {/* Сподели */}
          <button
            onClick={openShareSheet}
            className="flex items-center gap-1.5 text-[10px] lg:text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors">
            <Send size={14} className="lg:w-[18px] lg:h-[18px]" />
            <span className="hidden lg:inline">Сподели</span>
          </button>
        </div>
      </article>

      {shareSheetOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={(e) => {
              e.stopPropagation();
              setShareSheetOpen(false);
            }}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-1 w-10 rounded-full bg-zinc-200" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2">
              <p className="text-sm font-semibold text-zinc-800">Сподели</p>
              <button
                onClick={() => setShareSheetOpen(false)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100">
                <X size={16} />
              </button>
            </div>
            <div className="border-t border-zinc-100 px-4 py-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  {
                    label: "Facebook",
                    bg: "bg-[#1877F2]",
                    href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}${issuePath}` : issuePath)}`,
                    icon: (
                      <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                      </svg>
                    ),
                  },
                  {
                    label: "WhatsApp",
                    bg: "bg-[#25D366]",
                    href: `https://wa.me/?text=${encodeURIComponent(`${issue.title} ${typeof window !== "undefined" ? `${window.location.origin}${issuePath}` : issuePath}`)}`,
                    icon: (
                      <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    ),
                  },
                  {
                    label: "Viber",
                    bg: "bg-[#7360F2]",
                    href: `viber://forward?text=${encodeURIComponent(`${issue.title} ${typeof window !== "undefined" ? `${window.location.origin}${issuePath}` : issuePath}`)}`,
                    icon: (
                      <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.07-1.35A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 14.5c-.28 0-.53-.11-.71-.29l-2-2a1 1 0 0 1 0-1.42l.5-.5c.2-.2.2-.51 0-.71l-2-2a.5.5 0 0 0-.71 0l-.5.5C7.08 11.08 7 12 7 12c0 2.76 2.24 5 5 5 0 0 .92-.08 1.92-1.08l.5-.5c.2-.2.2-.51 0-.71l-2-2a.5.5 0 0 0-.71 0l-.5.5c-.2.2-.51.2-.71 0z" />
                      </svg>
                    ),
                  },
                  {
                    label: "LinkedIn",
                    bg: "bg-[#0A66C2]",
                    href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}${issuePath}` : issuePath)}`,
                    icon: (
                      <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                        <circle cx="4" cy="4" r="2" />
                      </svg>
                    ),
                  },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShareSheetOpen(false)}
                    className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center shadow-sm`}>
                      {item.icon}
                    </div>
                    <span className="text-[10px] text-zinc-600 font-medium">
                      {item.label}
                    </span>
                  </a>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={`mailto:?subject=${encodeURIComponent(issue.title)}&body=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}${issuePath}` : issuePath)}`}
                  onClick={() => setShareSheetOpen(false)}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
                  <Mail size={16} className="text-zinc-400" />
                  Email
                </a>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
                  <Link2 size={16} className="text-zinc-400" />
                  Копирај линк
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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
    </>
  );
}
