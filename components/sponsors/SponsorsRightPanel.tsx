"use client";

import { Heart, Star, Building2, Users, Zap, Shield, Gift } from "lucide-react";

interface Props {
  memberCount: number;
  companyCount: number;
  onJoin: () => void;
}

const GOAL = 50; // target member count

const PERKS = [
  { icon: <Star size={14} />,     text: "Значка на вашиот профил" },
  { icon: <Zap size={14} />,      text: "Приоритет при волонтерски акции" },
  { icon: <Shield size={14} />,   text: "Гласачко право во иницијативи" },
  { icon: <Gift size={14} />,     text: "Попусти кај локални партнери" },
];

export default function SponsorsRightPanel({ memberCount, companyCount, onJoin }: Props) {
  const pct = Math.min(100, Math.round((memberCount / GOAL) * 100));
  const remaining = Math.max(0, GOAL - memberCount);

  return (
    <div className="space-y-4 lg:p-3">

      {/* Goal tracker */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <p className="text-sm font-bold text-zinc-900">Наша цел: {GOAL} членови</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "#2aa99d" }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-semibold" style={{ color: "#2aa99d" }}>{memberCount} членови</span>
            <span>{remaining > 0 ? `уште ${remaining}` : "Целта е достигната! 🎉"}</span>
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Со {GOAL} членови можеме да финансираме{" "}
          <strong className="text-zinc-600">2 јавни акции годишно</strong> — садење дрвја, фарбање паркови, чистење на дивите депонии.
        </p>

        <button
          onClick={onJoin}
          className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "#2aa99d" }}>
          <Heart size={13} className="mr-1.5 inline" />
          Придружете се
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
          <Users size={18} className="mx-auto mb-1.5 text-zinc-400" />
          <p className="text-2xl font-black" style={{ color: "#2aa99d" }}>{memberCount}</p>
          <p className="text-xs text-zinc-500 font-medium">Членови</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
          <Building2 size={18} className="mx-auto mb-1.5 text-zinc-400" />
          <p className="text-2xl font-black" style={{ color: "#2aa99d" }}>{companyCount}</p>
          <p className="text-xs text-zinc-500 font-medium">Партнери</p>
        </div>
      </div>

      {/* Benefits */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Членовите добиваат</p>
        <ul className="space-y-2.5">
          {PERKS.map((p) => (
            <li key={p.text} className="flex items-center gap-2.5 text-sm text-zinc-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "#2aa99d" }}>
                {p.icon}
              </span>
              {p.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Company CTA */}
      <div className="rounded-2xl border border-dashed p-4 space-y-2 text-center" style={{ borderColor: "#2aa99d", background: "#d8f4ef33" }}>
        <Building2 size={22} className="mx-auto" style={{ color: "#2aa99d" }} />
        <p className="text-sm font-bold text-zinc-800">Имате бизнис?</p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Станете компанија партнер и добијте видливост меѓу илјадници граѓани на Прилеп.
        </p>
        <button
          onClick={onJoin}
          className="mt-1 rounded-xl border px-4 py-2 text-xs font-bold transition-opacity hover:opacity-80"
          style={{ borderColor: "#2aa99d", color: "#2aa99d" }}>
          Дознај повеќе
        </button>
      </div>

    </div>
  );
}
