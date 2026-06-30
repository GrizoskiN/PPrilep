"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  MapPin,
  Droplet,
  Trash2,
  Lightbulb,
  Bus,
  Building2,
  Pencil,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "../../lib/supabase/client";
import { formatDays, DISTRICT_LABELS } from "../../lib/utils";
import { AGENCIES, type AgencyId } from "../../lib/agencies";
import type { AgencyPost } from "../../lib/types/database";

/** Per-company icon, accent colour, and the utility page it links to. */
const AGENCY_META: Record<
  AgencyId,
  { icon: LucideIcon; color: string; href: string }
> = {
  vodovod: { icon: Droplet, color: "text-sky-600", href: "/utility/water" },
  komunalec: {
    icon: Trash2,
    color: "text-emerald-600",
    href: "/utility/garbage",
  },
  osvetluvanje: {
    icon: Lightbulb,
    color: "text-amber-500",
    href: "/utility/power",
  },
  transport_parking: {
    icon: Bus,
    color: "text-indigo-600",
    href: "/prevoz",
  },
  municipality: {
    icon: Building2,
    color: "text-slate-600",
    href: "/agency/municipality",
  },
};

// Bodies longer than this get clamped with a "read more" toggle.
const CLAMP_THRESHOLD = 160;

/** Audience summary line ("Цела населба: Центар" / "Улици: …" / "Сите граѓани"). */
function audienceLabel(post: AgencyPost): string {
  if (post.audience === "all") return "Сите граѓани";
  if (post.audience === "district") {
    return `Населба: ${DISTRICT_LABELS[post.target_district ?? ""] ?? post.target_district ?? "—"}`;
  }
  return `Улици: ${(post.target_streets ?? []).join(", ")}`;
}

export default function AgencyPostCard({
  post,
  showAgency = false,
  canManage = false,
}: {
  post: AgencyPost;
  showAgency?: boolean;
  /** Show edit/delete controls (the owning operator or an admin). */
  canManage?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body ?? "");
  const [busy, setBusy] = useState(false);
  const red = post.is_red_alert;
  const agencyName =
    AGENCIES[post.agency_id as AgencyId]?.name ?? post.agency_id;
  const meta = AGENCY_META[post.agency_id as AgencyId];
  const Icon = meta?.icon;

  const body = post.body ?? "";
  const isLong = body.length > CLAMP_THRESHOLD;
  const clickable = isLong && !editing;

  async function saveEdit() {
    if (!editTitle.trim()) {
      toast.error("Внеси наслов");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("update_agency_post", {
      p_id: post.id,
      p_title: editTitle.trim(),
      p_body: editBody.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Соопштението е изменето");
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Да се избрише ова соопштение?")) return;
    setBusy(true);
    const { error } = await supabase.rpc("delete_agency_post", {
      p_id: post.id,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Соопштението е избришано");
    router.refresh();
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Наслов"
          className="mb-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
        />
        <textarea
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          rows={3}
          placeholder="Детали (опционално)"
          className="mb-3 w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditTitle(post.title);
              setEditBody(post.body ?? "");
              setEditing(false);
            }}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100">
            Откажи
          </button>
          <button
            type="button"
            onClick={saveEdit}
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60">
            {busy ? "Се зачувува…" : "Зачувај"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={clickable ? () => setExpanded((v) => !v) : undefined}
      className={`rounded-xl border p-4 shadow-sm ${
        red ? "border-red-300 bg-red-50/70" : "border-theme bg-theme-surface"
      } ${clickable ? "cursor-pointer transition-colors hover:bg-zinc-50/60" : ""}`}>
      {/* 1. Company name + date */}
      <div className="mb-1 flex items-center justify-between gap-2">
        {showAgency && meta ? (
          <Link
            href={meta.href}
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${meta.color} hover:underline`}>
            {Icon && <Icon size={12} />}
            {agencyName}
          </Link>
        ) : showAgency ? (
          <span className="text-[11px] font-semibold text-theme-accent">
            {agencyName}
          </span>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[11px] text-theme-subtle">
            {formatDays(post.created_at)}
          </span>
          {canManage && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
                aria-label="Измени"
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove();
                }}
                disabled={busy}
                aria-label="Избриши"
                className="rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Title */}
      <h3
        className={`flex items-center gap-1.5 text-sm font-bold ${red ? "text-red-700" : "text-theme-heading"}`}>
        {red && <AlertTriangle size={15} className="shrink-0" />}
        {post.title}
      </h3>

      {/* 3. Body */}
      {body && (
        <p
          className={`mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-theme-muted ${
            isLong && !expanded ? "line-clamp-3" : ""
          }`}>
          {body}
        </p>
      )}
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="mt-1 text-[11px] font-semibold text-theme-accent hover:underline">
          {expanded ? "Прикажи помалку" : "Прочитај повеќе"}
        </button>
      )}

      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
        <MapPin size={11} />
        {audienceLabel(post)}
      </p>
    </div>
  );
}
