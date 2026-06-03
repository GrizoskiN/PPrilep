"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Plus, Lightbulb } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { useAuthContext as useAuth } from "../../lib/context/AuthContext";
import { STAGE_BADGE, STAGE_LABEL } from "../../lib/initiatives";
import { cn, formatDays } from "../../lib/utils";
import type { InitiativeWithDetails } from "../../lib/types/database";

const GOAL = 50;

export default function ProjectsRightPanel() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();

  const [initiatives, setInitiatives] = useState<InitiativeWithDetails[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [{ data: initData }, { count }] = await Promise.all([
        supabase
          .from("initiatives_with_details")
          .select("*")
          .in("stage", ["idea", "voting", "funding"])
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<InitiativeWithDetails[]>(),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .not("membership_tier", "is", null),
      ]);
      if (!mounted) return;
      setInitiatives(initData ?? []);
      setMemberCount(count ?? 0);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [supabase]);

  const progress = Math.min(100, Math.round((memberCount / GOAL) * 100));
  const remaining = Math.max(0, GOAL - memberCount);

  return (
    <div className="space-y-4 lg:p-3">

      {/* ── Member / Sponsor CTA ─────────────────────────────────── */}
      <section className="rounded-2xl border border-[#e4ece8] bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <p className="text-sm font-semibold text-slate-800">Наша цел: {GOAL} членови</p>
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between text-[11px]">
            <span className="font-semibold text-slate-700">{memberCount} членови</span>
            <span className="text-slate-400">уште {remaining}</span>
          </div>
        </div>
        <p className="text-[12px] text-slate-500 leading-relaxed">
          Со {GOAL} членови можеме да финансираме{" "}
          <span className="font-semibold text-slate-700">2 јавни акции годишно</span>{" "}
          — садење дрвја, фарбање паркови, чистење депонии.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={user ? "/account" : "/auth/login?next=/account"}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors">
            <Heart size={12} />
            Стани член
          </Link>
          <Link
            href="/sponsors"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#e4ece8] px-3 py-2 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary transition-colors">
            🤝 Партнер
          </Link>
        </div>
      </section>

      {/* ── Latest initiatives + Add button ─────────────────────── */}
      <section className="rounded-2xl border border-[#e4ece8] bg-white p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-theme-subtle">
            Активни иницијативи
          </p>
          <Link
            href="/initiatives/new"
            className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors">
            <Plus size={11} />
            Додади
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : initiatives.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Lightbulb size={24} className="text-slate-300" />
            <p className="text-xs text-slate-400">Нема активни иницијативи.</p>
            <Link
              href="/initiatives/new"
              className="text-xs font-semibold text-primary hover:underline">
              Биди прв — предложи идеја →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {initiatives.map((i) => (
              <Link
                key={i.id}
                href="/initiatives"
                className="block rounded-xl border border-[#e4ece8] px-3 py-2.5 transition-colors hover:border-[#cfe0da] hover:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold leading-snug text-slate-800 line-clamp-2">
                    {i.title}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                      STAGE_BADGE[i.stage as keyof typeof STAGE_BADGE],
                    )}>
                    {STAGE_LABEL[i.stage as keyof typeof STAGE_LABEL]}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  👏 {i.vote_count} · {formatDays(i.created_at)}
                </p>
              </Link>
            ))}
            <Link
              href="/initiatives"
              className="block rounded-xl border border-dashed border-[#cfe0da] py-2 text-center text-[11px] font-semibold text-primary hover:bg-[#f0faf7] transition-colors">
              Види сите иницијативи →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
