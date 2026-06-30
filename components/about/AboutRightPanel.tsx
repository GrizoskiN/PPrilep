"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import AvatarInitials, { TIER_CONFIG } from "../ui/AvatarInitials";
import type { MembershipTier } from "../ui/AvatarInitials";
import { userPath } from "../../lib/utils";
import { useAuthContext as useAuth } from "../../lib/context/AuthContext";

type Sponsor = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  points: number;
  membership_tier: string | null;
  is_company?: boolean;
};

type Member = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  points: number;
  membership_tier: string | null;
};

const COMPANY_TIERS = ["company_basic", "company_preferred", "company_premium"];
const TIER_ORDER: Record<string, number> = {
  company_premium: 0,
  company_preferred: 1,
  company_basic: 2,
};

const GOAL = 50;

export default function AboutRightPanel() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [{ data: sponsorData }, { data: memberData, count }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url, points, membership_tier, is_company")
            .or(`is_company.eq.true,membership_tier.in.(${COMPANY_TIERS.join(",")})`)
            .order("points", { ascending: false })
            .limit(50),

          supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url, points, membership_tier", {
              count: "exact",
            })
            .not("membership_tier", "is", null)
            .not("membership_tier", "in", `(${COMPANY_TIERS.join(",")})`)
            .order("points", { ascending: false })
            .limit(50),
        ]);

      if (!mounted) return;

      const sorted = ((sponsorData as Sponsor[] | null) ?? []).sort(
        (a, b) =>
          (TIER_ORDER[a.membership_tier ?? ""] ?? 9) -
          (TIER_ORDER[b.membership_tier ?? ""] ?? 9),
      );
      setSponsors(sorted);
      setMembers((memberData as Member[] | null) ?? []);
      setMemberCount(count ?? 0);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const progress = Math.min(100, Math.round((memberCount / GOAL) * 100));
  const remaining = Math.max(0, GOAL - memberCount);

  return (
    <div className="space-y-4 lg:p-3">
      {/* ── Member CTA ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-[#e4ece8] bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <p className="text-sm font-semibold text-slate-800">
            Наша цел: {GOAL} членови
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between text-[11px]">
            <span className="font-semibold text-slate-700">
              {memberCount} членови
            </span>
            <span className="text-slate-400">уште {remaining}</span>
          </div>
        </div>

        <p className="text-[12px] text-slate-500 leading-relaxed">
          Со {GOAL} членови можеме да финансираме{" "}
          <span className="font-semibold text-slate-700">
            2 јавни акции годишно
          </span>{" "}
          — садење дрвја, фарбање паркови, чистење на дивите депонии.
        </p>

        {user ? (
          <Link
            href="/sponsors?join=1"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
            <Heart size={14} />
            Стани член
          </Link>
        ) : (
          <Link
            href="/auth/login?next=%2Fsponsors%3Fjoin%3D1"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
            <Heart size={14} />
            Придружете се
          </Link>
        )}
      </section>

      {/* ── Sponsors ───────────────────────────────────────── */}
      <section className="rounded-2xl border border-[#e4ece8] bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-theme-subtle mb-3">
          Официјални партнери
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-11 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : sponsors.length === 0 ? (
          <p className="text-xs text-theme-muted">Нема активни партнери.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2 pr-0.5">
            {sponsors.map((s) => {
              const tier = s.membership_tier
                ? (TIER_CONFIG[s.membership_tier as keyof typeof TIER_CONFIG] ?? null)
                : null;
              const name = s.full_name ?? s.username ?? "Партнер";
              return (
                <Link
                  key={s.id}
                  href={userPath(s.username, s.id)}
                  className="flex items-center gap-2.5 rounded-xl border border-[#e4ece8] px-2.5 py-2 transition-colors hover:border-[#cfe0da] hover:bg-slate-50">
                  <AvatarInitials
                    name={name}
                    avatarUrl={s.avatar_url}
                    size="sm"
                    membershipTier={s.membership_tier as MembershipTier}
                    points={s.points}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{name}</p>
                    {tier && (
                      <p className="text-[10px] font-medium" style={{ color: tier.color }}>
                        {tier.emoji} {tier.label}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <Link
          href="/sponsors"
          className="mt-3 block rounded-xl border border-dashed border-[#cfe0da] py-2 text-center text-[11px] font-semibold text-primary hover:bg-[#f0faf7] transition-colors">
          Стани партнер →
        </Link>
      </section>

      {/* ── Members ────────────────────────────────────────── */}
      {!loading && members.length > 0 && (
        <section className="rounded-2xl border border-[#e4ece8] bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-theme-subtle mb-3">
            Членови на заедницата
          </p>
          <div className="max-h-72 overflow-y-auto space-y-1 pr-0.5">
            {members.map((m) => {
              const tier = m.membership_tier
                ? (TIER_CONFIG[m.membership_tier as keyof typeof TIER_CONFIG] ?? null)
                : null;
              const name = m.full_name ?? m.username ?? "Член";
              return (
                <Link
                  key={m.id}
                  href={userPath(m.username, m.id)}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50">
                  <AvatarInitials
                    name={name}
                    avatarUrl={m.avatar_url}
                    size="sm"
                    membershipTier={m.membership_tier as MembershipTier}
                    points={m.points}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{name}</p>
                    {tier && (
                      <p className="text-[10px] font-medium" style={{ color: tier.color }}>
                        {tier.emoji} {tier.label}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          {memberCount > 8 && (
            <Link
              href="/heroes"
              className="mt-2 block rounded-xl border border-dashed border-[#e4ece8] py-2 text-center text-[11px] font-semibold text-theme-muted hover:text-primary hover:border-[#cfe0da] transition-colors">
              Види сите {memberCount} членови →
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
