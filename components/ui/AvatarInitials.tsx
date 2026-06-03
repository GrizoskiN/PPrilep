"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn, cdnUrl } from "../../lib/utils";

export type MembershipTier =
  | "volunteer"
  | "monthly"
  | "yearly"
  | "company_basic"
  | "company_preferred"
  | "company_premium"
  | null
  | undefined;

interface Props {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  membershipTier?: MembershipTier;
  points?: number | null;
}

// ── Badge config ──────────────────────────────────────────────────────────────

export const TIER_CONFIG: Record<
  NonNullable<Exclude<MembershipTier, null | undefined>>,
  { emoji: string; label: string; bg: string; color: string }
> = {
  volunteer:         { emoji: "✓",  label: "Член — Волонтер",           bg: "#d8f4ef", color: "#2aa99d" },
  monthly:           { emoji: "★",  label: "Член — Месечна членарина",   bg: "#fef9c3", color: "#ca8a04" },
  yearly:            { emoji: "★",  label: "Член — Годишна членарина",   bg: "#fef08a", color: "#b45309" },
  company_basic:     { emoji: "🏢", label: "Партнер — Основно",          bg: "#e0e7ff", color: "#4f46e5" },
  company_preferred: { emoji: "🏢", label: "Партнер — Преферирано",      bg: "#ede9fe", color: "#7c3aed" },
  company_premium:   { emoji: "👑", label: "Партнер — Премиум",          bg: "#fce7f3", color: "#be185d" },
};

// ── Tooltip portal ────────────────────────────────────────────────────────────

interface TooltipPos { top: number; left: number; }

function TooltipPortal({ text, pos }: { text: string; pos: TooltipPos }) {
  return createPortal(
    <span
      className="pointer-events-none fixed z-9999 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xl"
      style={{
        top: pos.top,
        left: pos.left,
        transform: "translate(-50%, -100%)",
        background: "#1e293b",
      }}
    >
      {text}
      {/* caret */}
      <span
        className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent"
        style={{ borderTopColor: "#1e293b" }}
      />
    </span>,
    document.body,
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AvatarInitials({
  name, avatarUrl, size = "md", className, membershipTier, points,
}: Props) {
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const [imgError, setImgError] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const showTooltip = useCallback(() => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setTooltipPos({
      top: r.top - 8,           // 8px gap above the avatar
      left: r.left + r.width / 2,
    });
  }, []);

  const hideTooltip = useCallback(() => setTooltipPos(null), []);

  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const sizeClass =
    size === "sm" ? "w-6 h-6 text-[10px]" :
    size === "lg" ? "w-10 h-10 text-base" :
                    "w-8 h-8 text-xs";

  const badgeSize =
    size === "sm" ? "w-3 h-3 text-[7px]" :
    size === "lg" ? "w-4 h-4 text-[9px]" :
                    "w-3.5 h-3.5 text-[8px]";

  const showImg = !!avatarUrl && !imgError;

  const initialsEl = (extraClass?: string) => (
    <div className={cn(
      "rounded-full bg-zinc-900 text-white flex items-center justify-center font-semibold select-none shrink-0",
      sizeClass,
      extraClass,
    )}>
      {initials}
    </div>
  );

  const imgEl = (extraClass?: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cdnUrl(avatarUrl!)}
      alt={name ?? ""}
      className={cn("rounded-full object-cover shrink-0", sizeClass, extraClass)}
      onError={() => setImgError(true)}
    />
  );

  const tier = membershipTier ? TIER_CONFIG[membershipTier] : null;

  // No badge — return plain avatar, preserve className on the element itself
  if (!tier) {
    return showImg ? imgEl(className) : initialsEl(className);
  }

  const avatarEl = showImg ? imgEl() : initialsEl();

  const tooltipText = points != null
    ? `${tier.label} · ${points} аплаузи`
    : tier.label;

  return (
    <div
      ref={wrapRef}
      className={cn("relative inline-flex shrink-0", className)}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {avatarEl}

      {/* Badge */}
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 flex items-center justify-center",
          "rounded-full ring-[1.5px] ring-white font-bold leading-none select-none",
          badgeSize,
        )}
        style={{ background: tier.bg, color: tier.color }}
        aria-label={tier.label}
      >
        {tier.emoji}
      </span>

      {/* Tooltip rendered into document.body via portal — escapes overflow:hidden */}
      {tooltipPos && typeof window !== "undefined" && (
        <TooltipPortal text={tooltipText} pos={tooltipPos} />
      )}
    </div>
  );
}
