import { CreditCard, Globe, Zap } from "lucide-react";

// Bill payment is EVN's customer portal; outage checking is the grid operator
// (Elektrodistribucija) live outages map — two different companies, two links.
const PAYMENT_URL = "https://online.evn.mk/index/evnhome";
const OUTAGES_MAP_URL = "https://elektrodistribucija.mk/Grid/OutagesMap.aspx";

export default function ElectricityQuickActions() {
  return (
    <div className="space-y-3">
      {/* ── Pay bill CTA ─────────────────────────────────────────────────────── */}
      <a
        href={PAYMENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 p-4 shadow-sm hover:from-red-700 hover:to-red-800 transition-all active:scale-[0.99]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 group-hover:bg-white/30 transition-colors">
          <CreditCard size={22} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white leading-tight">
            Плати Сметка Онлајн
          </p>
          <p className="text-xs text-red-100 mt-0.5 leading-snug">
            Наплата на фактурите преку порталот на ЕВН Хоме
          </p>
        </div>
        <Globe size={16} className="shrink-0 text-red-200 group-hover:text-white transition-colors" />
      </a>

      {/* ── Live outages map CTA ─────────────────────────────────────────────── */}
      <a
        href={OUTAGES_MAP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm hover:border-red-300 hover:bg-red-100 transition-all active:scale-[0.99]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 group-hover:bg-red-200 transition-colors">
          <Zap size={22} className="text-red-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-red-900 leading-tight">
            Прекини на струја (мапа во живо)
          </p>
          <p className="text-xs text-red-700 mt-0.5 leading-snug">
            Проверете ги најновите планирани и итни прекини кај Електродистрибуција
          </p>
        </div>
        <Globe size={16} className="shrink-0 text-red-400 group-hover:text-red-700 transition-colors" />
      </a>
    </div>
  );
}
