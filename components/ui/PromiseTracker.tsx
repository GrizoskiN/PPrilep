"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuildingColumns } from "@fortawesome/free-solid-svg-icons";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface Promise {
  id: number;
  title: string;
  deadline: string;
  status: "on_track" | "delayed" | "completed";
  daysInfo: string;
}

// Dummy data — replace with DB table when ready
const PROMISES: Promise[] = [
  {
    id: 1,
    title: "Точила — паркинг осветлување",
    deadline: "15 апр",
    status: "delayed",
    daysInfo: "15 дена задоцнување",
  },
  {
    id: 2,
    title: "Поправка коловоз — Центар",
    deadline: "30 мај",
    status: "on_track",
    daysInfo: "Рок: 30 мај",
  },
  {
    id: 3,
    title: "Детско игралиште — Три Бари",
    deadline: "15 јун",
    status: "on_track",
    daysInfo: "Рок: 15 јун",
  },
  {
    id: 4,
    title: "Канализација — Варош ул. Бигор",
    deadline: "1 апр",
    status: "completed",
    daysInfo: "Завршено",
  },
];

const CONFIG = {
  on_track: {
    label: "ВО РОК",
    icon: Clock,
    badge: "bg-amber-100 text-amber-700 border border-amber-300",
    bar: "bg-amber-400",
  },
  delayed: {
    label: "ЗАДОЦНЕТ",
    icon: AlertCircle,
    badge: "bg-red-100 text-red-700 border border-red-300",
    bar: "bg-red-500",
  },
  completed: {
    label: "ГОТОВО",
    icon: CheckCircle2,
    badge: "bg-teal-100 text-teal-700 border border-teal-300",
    bar: "bg-teal-500",
  },
};

export default function PromiseTracker() {
  const active = PROMISES.filter((p) => p.status !== "completed");

  return (
    <div className="bg-[#f8f8f8] rounded-2xl  px-3 py-4">
      <div className="pb-5">
        <div className="xl:flex items-start gap-3">
          <div className="mt-0.5 text-gray-400">
            <FontAwesomeIcon icon={faBuildingColumns} className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[16px] font-semibold tracking-tight text-gray-800">
              Следење на ветувања
            </h3>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Следење на општинските рокови и јавно ветените проекти.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200">
        {active.slice(0, 2).map((p) => {
          const cfg = CONFIG[p.status];
          return (
            <div
              key={p.id}
              className="border-b border-gray-200 py-5 first:pt-6 last:border-b-0 transition-all duration-150 ease-in-out hover:bg-gray-50">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug text-gray-800">
                    {p.title}
                  </p>
                </div>
                <span
                  className={`shrink-0 border-0 rounded-md px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] ${cfg.badge}`}>
                  {cfg.label}
                </span>
              </div>

              <div className="h-1 overflow-hidden rounded-full w-full bg-[#eef2ef]">
                <div
                  className={`h-full rounded-full ${cfg.bar}`}
                  style={{ width: p.status === "delayed" ? "44%" : "76%" }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Ветено до {p.deadline} • {p.daysInfo}
              </p>
            </div>
          );
        })}
      </div>

      <div className="pt-5">
        <button className="w-full cursor-pointer rounded-lg border border-gray-200 bg-gray-800 px-2 py-2.5 text-sm font-semibold text-gray-100 transition-all duration-150 ease-in-out hover:bg-gray-900 hover:text-gray-100">
          Види ги сите ветувања
        </button>
      </div>
    </div>
  );
}
