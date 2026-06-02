"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import AvatarInitials from "./AvatarInitials";
import { TIER_CONFIG } from "./AvatarInitials";
import type { MembershipTier } from "./AvatarInitials";
import { userPath } from "../../lib/utils";

type Sponsor = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  points: number;
  membership_tier: string | null;
  is_company?: boolean;
};

const COMPANY_TIERS = ["company_basic", "company_preferred", "company_premium"];

const TIER_ORDER: Record<string, number> = {
  company_premium: 0,
  company_preferred: 1,
  company_basic: 2,
};

export default function PublicSponsorPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      // A profile is a "company partner" if it has a company tier OR the
      // is_company flag — matching the logic on the /sponsors page.
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, points, membership_tier, is_company")
        .or(
          `is_company.eq.true,membership_tier.in.(${COMPANY_TIERS.join(",")})`,
        )
        .order("points", { ascending: false })
        .limit(12);

      if (!mounted) return;
      const sorted = ((data as Sponsor[] | null) ?? []).sort(
        (a, b) =>
          (TIER_ORDER[a.membership_tier ?? ""] ?? 9) -
          (TIER_ORDER[b.membership_tier ?? ""] ?? 9),
      );
      setSponsors(sorted);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [supabase]);

  return (
    <div className="space-y-4 lg:p-3">
      <section className="rounded-2xl border border-[#e4ece8] bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-theme-subtle mb-3">
          Официјални партнери
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : sponsors.length === 0 ? (
          <p className="text-xs text-theme-muted">Нема активни партнери.</p>
        ) : (
          <div className="space-y-2">
            {sponsors.map((s) => {
              const tier = s.membership_tier
                ? TIER_CONFIG[s.membership_tier as keyof typeof TIER_CONFIG] ?? null
                : null;
              const href = userPath(s.username, s.id);
              const name = s.full_name ?? s.username ?? "Партнер";

              return (
                <Link
                  key={s.id}
                  href={href}
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
                      <p
                        className="text-[10px] font-medium"
                        style={{ color: tier.color }}>
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
    </div>
  );
}
