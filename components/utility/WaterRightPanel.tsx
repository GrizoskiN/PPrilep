"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";

const FB_PAGE_URL = "https://www.facebook.com/JKP.VIK.PP/";

export default function WaterRightPanel() {
  return (
    <div className="space-y-4 lg:p-3">

      {/* ── Water quality status ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">
            Исправност на водата
          </h3>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
          <p className="text-xs text-zinc-600 leading-relaxed">
            Водата во Општина Прилеп е здравствено{" "}
            <span className="font-semibold text-emerald-700">исправна</span> и
            безбедна за пиење.
          </p>
        </div>
        <a
          href="https://vodovod-prilep.mk/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline">
          vodovod-prilep.mk <ExternalLink size={10} />
        </a>
      </div>

      {/* ── Facebook page link ───────────────────────────────────────────────── */}
      <a
        href={FB_PAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 hover:bg-zinc-50 transition-colors group">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-[#1877F2]" aria-hidden>
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">
            Следете нè на Facebook
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">JKP Водовод и Канализација — Прилеп</p>
        </div>
        <ExternalLink size={13} className="shrink-0 text-zinc-300 group-hover:text-blue-400 transition-colors" />
      </a>

    </div>
  );
}
