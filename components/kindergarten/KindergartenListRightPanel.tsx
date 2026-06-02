"use client";

import { FileDown, Phone, Clock } from "lucide-react";
import WeeklyMenuPanel from "./WeeklyMenuPanel";
import type { SignupDocument, MenuPost } from "../../lib/sanity/kindergarten";

interface Props {
  signupDocuments: SignupDocument[];
  latestMenu: MenuPost | null;
}

export default function KindergartenListRightPanel({ signupDocuments, latestMenu }: Props) {
  return (
    <div className="space-y-4 lg:p-3">

      {/* ── Weekly menu ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🍽️</span>
            <p className="text-xs font-semibold text-zinc-500">Мени</p>
          </div>
          {latestMenu?.title && (
            <span className="text-[10px] text-zinc-400">{latestMenu.title}</span>
          )}
        </div>
        <WeeklyMenuPanel menu={latestMenu} />
      </div>

      {/* ── About ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌸</span>
          <p className="text-sm font-bold text-zinc-900">Наша Иднина</p>
        </div>
        <p className="text-xs leading-relaxed text-zinc-500">
          Јавна установа за деца со 4 објекти во Прилеп. Работи секој работен ден и нуди целодневна грижа, воспитување и образование.
        </p>
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock size={12} className="text-zinc-400" /> Работно време: 07:00 – 18:00
          </div>
          <a href="tel:048424076" className="flex items-center gap-2 text-xs text-zinc-500 hover:text-rose-500 transition-colors">
            <Phone size={12} className="text-zinc-400" /> 048 424 076
          </a>
        </div>
      </div>

      {/* ── Signup documents ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📄</span>
          <p className="text-xs font-semibold text-zinc-500">Документи за запишување</p>
        </div>
        {signupDocuments.length === 0 ? (
          <p className="text-xs text-zinc-400 italic">Наскоро ќе бидат достапни.</p>
        ) : (
          <div className="space-y-1">
            {signupDocuments.map((doc) => (
              <a key={doc._id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors group">
                <FileDown size={13} className="text-rose-400 shrink-0 group-hover:text-rose-500" />
                <span className="flex-1 truncate">{doc.title}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Age groups ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
        <p className="text-xs font-semibold text-zinc-500">Возрасни групи</p>
        <div className="space-y-1.5">
          {[
            { age: "6 мес – 2 год", label: "Јасли" },
            { age: "2 – 3 год",     label: "Мали" },
            { age: "3 – 4 год",     label: "Средни" },
            { age: "4 – 6 год",     label: "Големи" },
          ].map((g) => (
            <div key={g.label} className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700">{g.label}</span>
              <span className="text-[11px] text-zinc-400">{g.age}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
