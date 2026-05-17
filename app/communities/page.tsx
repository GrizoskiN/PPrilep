import { createClient } from "../../lib/supabase/server";
import Shell from "../../components/layout/Shell";
import { DISTRICT_LABELS } from "../../lib/utils";
import DistrictCard from "../../components/communities/DistrictCard";
import type { District, Category } from "../../lib/types/database";
import type { DistrictStat, CategoryStat } from "../../components/communities/DistrictCard";

const DISTRICTS: District[] = [
  "Center",
  "Varoš",
  "Trizla",
  "Točila",
  "Rid",
  "Tipski",
  "Boncejca",
  "KorzoMaalo",
];

const CATEGORIES: Category[] = [
  "road", "water", "power", "garbage", "park",
  "negligent", "transport", "parking", "admin", "other",
];

export default async function CommunitiesPage() {
  const supabase = await createClient();
  const { data: issues } = await supabase
    .from("issues")
    .select("district, status, category");

  const allIssues = issues ?? [];

  // Compute per-district, per-category breakdown
  const stats: DistrictStat[] = DISTRICTS.map((d) => {
    const dIssues = allIssues.filter((i) => i.district === d);

    const byCategory: CategoryStat[] = CATEGORIES.map((cat) => {
      const catIssues = dIssues.filter((i) => i.category === cat);
      return {
        category: cat,
        total: catIssues.length,
        open: catIssues.filter((i) => i.status === "open").length,
        progress: catIssues.filter((i) => i.status === "progress").length,
        resolved: catIssues.filter((i) => i.status === "resolved").length,
      };
    }).filter((c) => c.total > 0); // only categories with data

    return {
      district: d,
      label: DISTRICT_LABELS[d] ?? d,
      total: dIssues.length,
      open: dIssues.filter((i) => i.status === "open").length,
      progress: dIssues.filter((i) => i.status === "progress").length,
      resolved: dIssues.filter((i) => i.status === "resolved").length,
      byCategory,
    };
  });

  // City-wide totals for the summary banner
  const cityTotal = allIssues.length;
  const cityOpen = allIssues.filter((i) => i.status === "open").length;
  const cityProgress = allIssues.filter((i) => i.status === "progress").length;
  const cityResolved = allIssues.filter((i) => i.status === "resolved").length;

  return (
    <Shell>
      <div className="p-4 space-y-5">
        {/* Page header */}
        <div>
          <h1 className="text-base font-semibold">Населби</h1>
          <p className="text-xs text-zinc-500">
            Статистика и проблеми по населби — кликнете за детален преглед
          </p>
        </div>

        {/* City-wide summary banner */}
        <div className="bg-zinc-900 text-white rounded-xl px-4 py-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
            Прилеп — Вкупно
          </p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-xl font-bold">{cityTotal}</p>
              <p className="text-[10px] text-zinc-400 uppercase mt-0.5">Вкупно</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-400">{cityOpen}</p>
              <p className="text-[10px] text-zinc-400 uppercase mt-0.5">Отворени</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-400">{cityProgress}</p>
              <p className="text-[10px] text-zinc-400 uppercase mt-0.5">Во тек</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">{cityResolved}</p>
              <p className="text-[10px] text-zinc-400 uppercase mt-0.5">Решени</p>
            </div>
          </div>
          {/* City-wide progress bar */}
          {cityTotal > 0 && (
            <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-700 overflow-hidden flex">
              <div className="h-full bg-red-400" style={{ width: `${(cityOpen / cityTotal) * 100}%` }} />
              <div className="h-full bg-amber-400" style={{ width: `${(cityProgress / cityTotal) * 100}%` }} />
              <div className="h-full bg-emerald-400" style={{ width: `${(cityResolved / cityTotal) * 100}%` }} />
            </div>
          )}
        </div>

        {/* District cards */}
        <div className="space-y-3">
          {stats.map((s) => (
            <DistrictCard key={s.district} stat={s} />
          ))}
        </div>
      </div>
    </Shell>
  );
}
