"use client";

import { Zap, CreditCard, ExternalLink } from "lucide-react";

const OUTAGES_MAP_URL = "https://elektrodistribucija.mk/Grid/OutagesMap.aspx";
const PAYMENT_URL = "https://online.evn.mk/index/evnhome";

export default function ElectricityRightPanel() {
  return (
    <div className="space-y-4 lg:p-3">
      {/* ── Live outages map ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-red-500 shrink-0" />
          <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">
            Прекини на струја
          </h3>
        </div>
        <p className="text-xs text-zinc-600 leading-relaxed">
          Проверете ги најновите планирани и итни прекини во напојувањето на
          мапата во живо на Електродистрибуција.
        </p>
        <a
          href={OUTAGES_MAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:underline">
          Отвори мапа на прекини <ExternalLink size={10} />
        </a>
      </div>

      {/* ── Pay bill (EVN Home) ──────────────────────────────────────────────── */}
      <a
        href={PAYMENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 hover:bg-zinc-50 transition-colors group">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
          <CreditCard size={17} className="text-red-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-900 group-hover:text-red-600 transition-colors">
            Плати сметка — ЕВН Хоме
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">online.evn.mk</p>
        </div>
        <ExternalLink size={13} className="shrink-0 text-zinc-300 group-hover:text-red-400 transition-colors" />
      </a>
    </div>
  );
}
