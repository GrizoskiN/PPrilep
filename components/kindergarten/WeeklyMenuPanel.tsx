"use client";

import { useState } from "react";
import type { MenuPost, DayMenu } from "../../lib/sanity/kindergarten";

const DAY_KEYS: (keyof MenuPost)[] = ["monday","tuesday","wednesday","thursday","friday"];
const DAY_SHORT = ["Пон","Вто","Сре","Чет","Пет"];
const DAY_FULL  = ["Понеделник","Вторник","Среда","Четврток","Петок"];

function todayIdx() {
  const d = new Date().getDay(); // 0=Sun
  return d >= 1 && d <= 5 ? d - 1 : 0;
}

interface Props { menu: MenuPost | null }

export default function WeeklyMenuPanel({ menu }: Props) {
  const [activeDay, setActiveDay] = useState(todayIdx());
  const [showAll, setShowAll] = useState(false);

  if (!menu) return <p className="text-xs text-zinc-400 italic">Нема внесено мени.</p>;

  const day = menu[DAY_KEYS[activeDay]] as DayMenu | null;

  if (showAll) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-700">{menu.title}</p>
          <button onClick={() => setShowAll(false)} className="text-[11px] text-zinc-400 hover:text-zinc-700">
            Само денес ›
          </button>
        </div>
        {DAY_KEYS.map((key, i) => {
          const d = menu[key] as DayMenu | null;
          if (!d) return null;
          return (
            <div key={key} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 space-y-1.5">
              <p className="text-[11px] font-bold text-zinc-500">{DAY_FULL[i]}</p>
              {d.breakfast && <p className="text-xs text-zinc-700"><span className="text-zinc-400">Појадок: </span>{d.breakfast}</p>}
              {d.snack1    && <p className="text-xs text-zinc-700"><span className="text-zinc-400">Ужина: </span>{d.snack1}</p>}
              {d.lunch     && <p className="text-xs text-zinc-700"><span className="text-zinc-400">Ручек: </span>{d.lunch}</p>}
              {d.snack2    && <p className="text-xs text-zinc-700"><span className="text-zinc-400">Ужинка 2: </span>{d.snack2}</p>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Day tabs */}
      <div className="flex gap-1">
        {DAY_SHORT.map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveDay(i)}
            className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-colors"
            style={activeDay === i
              ? { background: "#2aa99d", color: "white" }
              : { background: "#f4f4f5", color: "#71717a" }
            }>
            {label}
          </button>
        ))}
      </div>

      {/* Today's meals */}
      {day ? (
        <div className="space-y-2">
          {day.breakfast && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">Појадок</p>
              <p className="text-xs text-zinc-700">{day.breakfast}</p>
            </div>
          )}
          {day.snack1 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">Ужина</p>
              <p className="text-xs text-zinc-700">{day.snack1}</p>
            </div>
          )}
          {day.lunch && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">Ручек</p>
              <p className="text-xs text-zinc-700 whitespace-pre-line">{day.lunch}</p>
            </div>
          )}
          {day.snack2 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">Ужинка 2</p>
              <p className="text-xs text-zinc-700">{day.snack2}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-400 italic">Нема мени за овој ден.</p>
      )}

      <button
        onClick={() => setShowAll(true)}
        className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 transition-colors">
        Прикажи цела недела ›
      </button>
    </div>
  );
}
