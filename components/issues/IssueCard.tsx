"use client";

import { useState } from "react";
import BlurImage from "../ui/BlurImage";
import Link from "next/link";
import { Send, HandHelping, Zap, MessageCircle, X } from "lucide-react";
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
        <p className="text-xs font-semibold text-zinc-700">{users.length} луѓе</p>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <X size={12} />
        </button>
      </div>
      {users.map((u) => {
        const name = u.profiles?.full_name ?? u.profiles?.username ?? "Анонимно";
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

  function share(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(`${location.origin}${issuePath}`);
    toast.success("Линкот е копиран!");
  }

  async function toggleAffected(e: React.MouseEvent) {
    e.stopPropagation();
    if (!userId) { redirectToAuth(); return; }
    if (loadingAff) return;
    setLoadingAff(true);
    const { createClient } = await import("../../lib/supabase/client");
    const supabase = createClient();
    if (isAffected) {
      await supabase.from("issue_affected").delete().eq("issue_id", issue.id).eq("user_id", userId);
      const { count } = await supabase.from("issue_affected").select("*", { count: "exact", head: true }).eq("issue_id", issue.id);
      setIsAffected(false);
      setAffectedCount(count ?? 0);
    } else {
      await supabase.from("issue_affected").insert({ issue_id: issue.id, user_id: userId });
      const { count } = await supabase.from("issue_affected").select("*", { count: "exact", head: true }).eq("issue_id", issue.id);
      setIsAffected(true);
      setAffectedCount(count ?? 0);
      toast.success("Означени сте како засегнати");
    }
    setLoadingAff(false);
  }

  function openHelper(e: React.MouseEvent) {
    e.stopPropagation();
    if (!userId) { redirectToAuth(); return; }
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
    setHelperUsers((data ?? []).map((r) => ({
      ...r,
      profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
    })) as UserEntry[]);
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
    setAffectedUsers((data ?? []).map((r) => ({
      ...r,
      profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
    })) as UserEntry[]);
    setShowAffectedPop(true);
    setShowHelperPop(false);
  }

  const hasPhoto = !!(issue.photo_url || issue.after_photo_url);

  return (
    <>
      {(showAffectedPop || showHelperPop) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowAffectedPop(false); setShowHelperPop(false); }}
        />
      )}

      <article
        onClick={onClick}
        className="cursor-pointer bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 transition-colors">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
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
              <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
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
                {categoryIcon(issue.category)} {CATEGORY_LABELS[issue.category] ?? issue.category}
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
                <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* ── Image ──────────────────────────────────────── */}
        {hasPhoto && (
          issue.photo_url && issue.after_photo_url ? (
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
                  className="h-72 w-full object-cover"
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
                  className="h-72 w-full object-cover"
                />
                <span className="absolute top-1.5 left-1.5 rounded-md bg-teal-600/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Потоа
                </span>
                {issue.resolver && (
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1.5 rounded-lg bg-black/65 backdrop-blur-sm px-2 py-1">
                    <span className="text-xs">🏆</span>
                    <AvatarInitials
                      name={issue.resolver.full_name ?? issue.resolver.username ?? ""}
                      avatarUrl={issue.resolver.avatar_url}
                      size="sm"
                      className="w-4! h-4! text-[8px]!"
                    />
                    <span className="text-[10px] font-semibold text-white truncate">
                      {issue.resolver.full_name ?? issue.resolver.username ?? "Херој"}
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
              className="h-80 w-full object-cover"
            />
          )
        )}

        {/* ── Title ──────────────────────────────────────── */}
        <div className={cn("px-3", hasPhoto ? "pt-2.5 pb-1" : "pt-2 pb-1")}>
          <p className="text-sm font-semibold text-zinc-800 line-clamp-2 leading-snug">
            {issue.title}
          </p>
        </div>

        {/* ── Action bar ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 pt-1 pb-3">
          <div className="flex items-center gap-3 lg:gap-4">

            {/* Помогни */}
            <div className="relative flex items-center gap-0.5 lg:gap-1">
              <button
                onClick={showHelpers}
                className={cn(
                  "text-[11px] lg:text-xs font-bold tabular-nums transition-colors",
                  helperCount > 0 ? "text-zinc-700 hover:text-teal-600 cursor-pointer" : "text-zinc-400 cursor-default",
                )}>
                {helperCount}
              </button>
              <button
                onClick={openHelper}
                className={cn(
                  "flex items-center gap-0.5 lg:gap-1 text-[10px] lg:text-xs font-medium transition-colors",
                  isHelper ? "text-teal-600" : "text-zinc-500 hover:text-teal-600",
                )}>
                <HandHelping size={13} className="lg:w-[15px] lg:h-[15px]" />
                <span>Помогни</span>
              </button>
              {showHelperPop && helperUsers.length > 0 && (
                <UserListPopup users={helperUsers} onClose={() => setShowHelperPop(false)} />
              )}
            </div>

            {/* Иста мака */}
            <div className="relative flex items-center gap-0.5 lg:gap-1">
              <button
                onClick={showAffected}
                className={cn(
                  "text-[11px] lg:text-xs font-bold tabular-nums transition-colors",
                  affectedCount > 0 ? "text-zinc-700 hover:text-amber-600 cursor-pointer" : "text-zinc-400 cursor-default",
                )}>
                {affectedCount}
              </button>
              <button
                onClick={toggleAffected}
                disabled={loadingAff}
                className={cn(
                  "flex items-center gap-0.5 lg:gap-1 text-[10px] lg:text-xs font-medium transition-colors",
                  isAffected ? "text-amber-600" : "text-zinc-500 hover:text-amber-600",
                )}>
                <Zap size={13} className="lg:w-[15px] lg:h-[15px]" />
                <span>Иста мака</span>
              </button>
              {showAffectedPop && affectedUsers.length > 0 && (
                <UserListPopup users={affectedUsers} onClose={() => setShowAffectedPop(false)} />
              )}
            </div>

            {/* Коментари */}
            <button
              onClick={(e) => { e.stopPropagation(); onClick?.(); }}
              className="flex items-center gap-0.5 lg:gap-1 text-[10px] lg:text-xs font-medium text-zinc-500 hover:text-blue-600 transition-colors">
              <span className={cn(
                "text-[11px] lg:text-xs font-bold tabular-nums mr-0.5",
                (issue.comment_count ?? 0) > 0 ? "text-zinc-700" : "text-zinc-400",
              )}>
                {issue.comment_count ?? 0}
              </span>
              <MessageCircle size={13} className="lg:w-[15px] lg:h-[15px]" />
              <span>Коментари</span>
            </button>
          </div>

          {/* Сподели */}
          <button
            onClick={share}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors">
            <Send size={14} />
            <span className="hidden lg:inline">Сподели</span>
          </button>
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
    </>
  );
}
