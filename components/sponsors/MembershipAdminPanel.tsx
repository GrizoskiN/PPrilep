"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { ShieldCheck, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import AvatarInitials, { type MembershipTier } from "../ui/AvatarInitials";
import {
  adminFetchMembers,
  adminSetMembershipTier,
  type MembershipTier as TierType,
} from "../../app/actions/membership";

// ── Tier display config ───────────────────────────────────────────────────────

const TIER_OPTIONS: { value: TierType | "none"; label: string; color: string }[] = [
  { value: "none",               label: "— Нема —",            color: "#9ca3af" },
  { value: "volunteer",          label: "Волонтер",             color: "#2aa99d" },
  { value: "monthly",            label: "Месечна членарина",    color: "#ca8a04" },
  { value: "yearly",             label: "Годишна членарина",    color: "#b45309" },
  { value: "company_basic",      label: "Партнер — Основно",    color: "#4f46e5" },
  { value: "company_preferred",  label: "Партнер — Преферирано",color: "#7c3aed" },
  { value: "company_premium",    label: "Партнер — Премиум",    color: "#be185d" },
];

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  points: number;
  membership_tier: string | null;
  created_at: string;
}

// ── Tier select per row ───────────────────────────────────────────────────────

function TierSelect({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState<string>(profile.membership_tier ?? "none");

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const prev = current;
    // Optimistic update — flip the UI immediately
    setCurrent(val);
    startTransition(async () => {
      const tier = val === "none" ? null : (val as TierType);
      const res = await adminSetMembershipTier(profile.id, tier);
      if (res.error) {
        // Revert on failure
        setCurrent(prev);
        toast.error(res.error);
      } else {
        const label = TIER_OPTIONS.find((o) => o.value === val)?.label ?? val;
        toast.success(`${profile.full_name ?? "Корисник"} → ${label}`);
      }
    });
  }

  const tierOption = TIER_OPTIONS.find((o) => o.value === current) ?? TIER_OPTIONS[0];

  return (
    <div className="relative inline-flex items-center gap-1.5">
      {pending && (
        <RefreshCw size={12} className="animate-spin text-zinc-400 shrink-0" />
      )}
      <select
        value={current}
        onChange={handleChange}
        disabled={pending}
        className={cn(
          "appearance-none rounded-lg border px-3 py-1.5 pr-6 text-xs font-semibold",
          "bg-white outline-none cursor-pointer transition-colors",
          "focus:ring-2 focus:ring-[#2aa99d]/30",
          pending && "opacity-50 pointer-events-none",
        )}
        style={{ borderColor: tierOption.color, color: tierOption.color }}
      >
        {TIER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {/* Chevron */}
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
        width="10" height="10" viewBox="0 0 10 10" fill="none"
        style={{ color: tierOption.color }}
      >
        <path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function MembershipAdminPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "members" | "none">("all");
  const [search, setSearch]     = useState("");

  useEffect(() => {
    adminFetchMembers().then(({ data }) => {
      setProfiles((data as Profile[]) ?? []);
      setLoading(false);
    });
  }, []);

  const q = search.toLowerCase().trim();
  const shown = profiles.filter((p) => {
    if (filter === "members") { if (p.membership_tier === null) return false; }
    if (filter === "none")    { if (p.membership_tier !== null) return false; }
    if (!q) return true;
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q)
    );
  });

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={17} className="text-zinc-500" />
          <h2 className="text-sm font-bold text-zinc-900">Управување со членови</h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">
            Admin
          </span>
        </div>

        {/* Filter chips */}
        <div className="ml-auto flex gap-1.5">
          {(["all", "members", "none"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                filter === f
                  ? "border-zinc-800 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-500 hover:border-zinc-300",
              )}
            >
              {f === "all" ? "Сите" : f === "members" ? "Само членови" : "Без статус"}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Пребарај по ime или @username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#2aa99d] focus:bg-white transition-colors"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-sm text-zinc-400">
          <RefreshCw size={15} className="animate-spin mr-2" /> Се вчитува…
        </div>
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">Нема корисници.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="pb-2 text-left text-xs font-semibold text-zinc-400 pr-4">Корисник</th>
                <th className="pb-2 text-left text-xs font-semibold text-zinc-400 pr-4">Аплаузи</th>
                <th className="pb-2 text-left text-xs font-semibold text-zinc-400">Статус / Членарина</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {shown.map((p) => (
                <tr key={p.id} className="group/row hover:bg-zinc-50/70 transition-colors">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2.5 group">
                      <AvatarInitials
                        name={p.full_name}
                        avatarUrl={p.avatar_url}
                        size="sm"
                        membershipTier={p.membership_tier as MembershipTier}
                        points={p.points}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-zinc-800 max-w-[140px]">
                          {p.full_name ?? "—"}
                        </p>
                        {p.username && (
                          <p className="text-[10px] text-zinc-400">@{p.username}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-xs font-bold text-zinc-700">{p.points}</span>
                  </td>
                  <td className="py-2.5">
                    <TierSelect profile={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
