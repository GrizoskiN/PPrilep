// Membership tier definitions — the single source of truth for tier badges.
//
// This MUST be a plain (non-"use client") module so it can be imported by both
// server components (e.g. the public profile page) and client components. When
// this config lived inside the "use client" AvatarInitials component, server
// components received a client-reference placeholder instead of the real object,
// so TIER_CONFIG[tier] was undefined on the server and badges never rendered.

export type MembershipTier =
  | "volunteer"
  | "monthly"
  | "yearly"
  | "mega_donor"
  | "company_basic"
  | "company_preferred"
  | "company_premium"
  | null
  | undefined;

export const TIER_CONFIG: Record<
  NonNullable<Exclude<MembershipTier, null | undefined>>,
  { emoji: string; label: string; bg: string; color: string }
> = {
  volunteer:         { emoji: "✓",  label: "Член — Волонтер",           bg: "#d8f4ef", color: "#2aa99d" },
  monthly:           { emoji: "★",  label: "Член — Месечна членарина",   bg: "#fef9c3", color: "#ca8a04" },
  yearly:            { emoji: "★",  label: "Член — Годишна членарина",   bg: "#fef08a", color: "#b45309" },
  mega_donor:        { emoji: "🏆", label: "Член — МегаГига Донатор",     bg: "#fdeaa8", color: "#92610a" },
  company_basic:     { emoji: "🏢", label: "Партнер — Основно",          bg: "#e0e7ff", color: "#4f46e5" },
  company_preferred: { emoji: "🏢", label: "Партнер — Преферирано",      bg: "#ede9fe", color: "#7c3aed" },
  company_premium:   { emoji: "👑", label: "Партнер — Премиум",          bg: "#fce7f3", color: "#be185d" },
};
