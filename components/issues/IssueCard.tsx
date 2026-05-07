"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Share2,
  AlertTriangle,
  HandHelping,
  MapPin,
  Check,
} from "lucide-react";
import StatusPill from "../ui/StatusPill";
import AvatarInitials from "../ui/AvatarInitials";
import {
  formatDays,
  districtColor,
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

interface Props {
  issue: Issue;
  userId?: string;
  onClick?: () => void;
  selected?: boolean;
  embeddedMobile?: boolean;
  eagerImage?: boolean;
  onAffectedToggle?: (affected: boolean, count: number) => void;
}

export default function IssueCard({
  issue,
  userId,
  onClick,
  selected,
  embeddedMobile = false,
  eagerImage = false,
}: Props) {
  const [affectedCount, setAffectedCount] = useState(issue.affected_count ?? 0);
  const [helperCount, setHelperCount] = useState(issue.helper_count ?? 0);
  const [isAffected, setIsAffected] = useState(issue.is_affected ?? false);
  const [isHelper, setIsHelper] = useState(issue.is_helper ?? false);
  const [helperOpen, setHelperOpen] = useState(false);
  const [loadingAff, setLoadingAff] = useState(false);
  const issuePath = getIssuePath(issue.id, issue.title);

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
    if (isHelper) return; // already helping — detail view handles removal
    setHelperOpen(true);
  }

  return (
    <>
      <article
        onClick={onClick}
        className={cn(
          "cursor-pointer p-4 transition-all",
          embeddedMobile
            ? "rounded-none border-0 bg-transparent hover:border-transparent hover:shadow-none"
            : "rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm",
          selected && "border-teal-500 ring-1 ring-teal-500",
        )}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                districtColor(issue.district),
              )}>
              {DISTRICT_LABELS[issue.district] ?? issue.district}
            </span>
            <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-md">
              {categoryIcon(issue.category)}{" "}
              {CATEGORY_LABELS[issue.category] ?? issue.category}
            </span>
            <StatusPill status={issue.status} />
          </div>
          <button
            onClick={share}
            className="text-zinc-400 hover:text-zinc-700 shrink-0 cursor-pointer">
            <Share2 size={13} />
          </button>
        </div>

        <div
          className={cn(
            embeddedMobile ? "block" : "md:flex md:items-start md:gap-3",
          )}>
          {issue.photo_url && (
            <div
              className={cn(
                "mb-3 w-full overflow-hidden rounded-lg border border-zinc-200",
                !embeddedMobile && "md:mb-0 md:w-60 md:shrink-0",
              )}>
              <Image
                src={issue.photo_url}
                alt="Фотографија"
                width={640}
                height={640}
                unoptimized
                loading={eagerImage ? "eager" : "lazy"}
                priority={eagerImage}
                sizes="(max-width: 767px) 100vw, 160px"
                className={cn(
                  "h-52 w-full object-cover",
                  !embeddedMobile && "md:h-60",
                )}
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                <Link
                  href={issuePath}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline">
                  {issue.title}
                </Link>
              </h3>
              <span className="shrink-0 text-[11px] text-zinc-400">
                {formatDays(issue.created_at)}
              </span>
            </div>

            {issue.street_name && (
              <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-teal-600">
                <MapPin size={10} /> {issue.street_name}
              </p>
            )}

            {issue.description && (
              <p className="mb-2 text-xs text-zinc-500 line-clamp-2">
                {issue.description}
              </p>
            )}
            <div className="flex items-center gap-1.5">
              {issue.profiles && (
                <AvatarInitials
                  name={issue.profiles.full_name}
                  avatarUrl={issue.profiles.avatar_url}
                  size="sm"
                />
              )}
              <span className="text-[11px] text-zinc-500">
                {issue.profiles?.full_name ?? "Анонимно"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3  pt-3">
          <div
            className={cn(
              "grid grid-cols-1 lg:grid-cols-2 gap-2",
              !embeddedMobile && "md:hidden",
            )}>
            <button
              onClick={openHelper}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl border border-transparent px-2 py-2.5 text-sm lg:text-xs xl:text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]",
                isHelper ? "bg-[#255a52]" : "bg-[#3b9f95] hover:bg-[#338c84]",
              )}
              style={{
                backgroundColor: isHelper ? "#255a52" : "#3b9f95",
                color: "#ffffff",
              }}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/20 text-xs font-bold text-white">
                {helperCount}
              </span>
              <HandHelping size={14} />
              <span>{isHelper ? "Помагам" : "Помогни (Поправи)"}</span>
            </button>

            <button
              onClick={toggleAffected}
              disabled={loadingAff}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-sm lg:text-xs xl:text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
                isAffected
                  ? "border-transparent bg-[#0f1a33] text-white"
                  : "border-[#c8d0d8] bg-white text-slate-700 hover:bg-slate-50",
              )}
              style={
                isAffected
                  ? {
                      backgroundColor: "#0f1a33",
                      borderColor: "transparent",
                      color: "#ffffff",
                    }
                  : {
                      backgroundColor: "#ffffff",
                      borderColor: "#c8d0d8",
                      color: "#334155",
                    }
              }>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                  isAffected
                    ? "bg-white/20 text-white"
                    : "bg-[#eef2f7] text-slate-700",
                )}>
                {affectedCount}
              </span>
              {isAffected ? <Check size={14} /> : <AlertTriangle size={14} />}
              <span>{isAffected ? "Засегнат/а" : "И јас сум засегнат/а"}</span>
            </button>
          </div>

          <div
            className={cn(
              "hidden items-center justify-between md:flex",
              embeddedMobile && "hidden",
            )}>
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={toggleAffected}
                disabled={loadingAff}
                className={cn(
                  "flex items-center gap-1 text-xs rounded-lg px-2 py-1 transition-colors cursor-pointer",
                  isAffected
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : "text-zinc-500 hover:bg-red-50 hover:text-red-600",
                )}>
                <AlertTriangle size={11} /> {affectedCount}
              </button>
              <button
                onClick={openHelper}
                className={cn(
                  "flex items-center gap-1 text-xs rounded-lg px-2 py-1 transition-colors cursor-pointer",
                  isHelper
                    ? "bg-teal-50 text-teal-600 border border-teal-200"
                    : "text-zinc-500 hover:bg-teal-50 hover:text-teal-600",
                )}>
                <HandHelping size={11} /> {helperCount}
              </button>
            </div>
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
    </>
  );
}
