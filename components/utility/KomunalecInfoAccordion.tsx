"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Phone } from "lucide-react";
import { cn } from "../../lib/utils";

// ── Department contacts ────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { name: "Централа", phone: "048/428-992", tel: "+38948428992" },
  { name: "Односување отпад", phone: "072/248-320", tel: "+38972248320" },
  { name: "Паркови и зеленило", phone: "070/401-638", tel: "+38970401638" },
  { name: "Гробишта", phone: "075/282-347", tel: "+38975282347" },
  { name: "Финансиски сектор", phone: "071/340-330", tel: "+38971340330" },
  { name: "Односи со јавност", phone: "071/340-213", tel: "+38971340213" },
  { name: "Пријава бездомни кучиња", phone: "076/207-113", tel: "+38976207113" },
];

// ── Services ──────────────────────────────────────────────────────────────────
const SERVICES = [
  { icon: "🗑️", name: "Комунален отпад", desc: "Собирање, транспорт и депонирање" },
  { icon: "🌿", name: "Паркови и зеленило", desc: "Одржување јавни површини и паркови" },
  { icon: "🪦", name: "Гробишта", desc: "Управување и одржување на гробишта" },
  { icon: "🧹", name: "Јавна хигиена", desc: "Метење и чистење на улици" },
  { icon: "♻️", name: "Рециклирање", desc: "Собирање селектиран и текстилен отпад" },
  { icon: "🐕", name: "Бездомни животни", desc: "Прифатилиште и грижа за бездомни кучиња" },
];

function AccordionSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 transition-colors text-left">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          {icon}
        </span>
        <span className="flex-1 text-sm font-semibold text-zinc-900">{title}</span>
        <ChevronDown
          size={15}
          className={cn("shrink-0 text-zinc-400 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="border-t border-zinc-100">{children}</div>}
    </div>
  );
}

export default function KomunalecInfoAccordion() {
  return (
    <div className="space-y-2.5">

      {/* Services */}
      <AccordionSection title="Услуги" icon={<span className="text-sm">🗑️</span>}>
        <div className="divide-y divide-zinc-50">
          {SERVICES.map((s) => (
            <div key={s.name} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg shrink-0">{s.icon}</span>
              <div>
                <p className="text-xs font-medium text-zinc-800">{s.name}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Department contacts */}
      <AccordionSection
        title="Контакти по сектори"
        icon={<Phone size={14} />}>
        <div className="divide-y divide-zinc-50">
          {DEPARTMENTS.map((d) => (
            <a
              key={d.tel}
              href={`tel:${d.tel}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group">
              <p className="text-xs font-medium text-zinc-700 group-hover:text-emerald-700 transition-colors">
                {d.name}
              </p>
              <span className="shrink-0 text-xs font-bold text-emerald-700 tabular-nums">
                {d.phone}
              </span>
            </a>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-zinc-50">
          <a
            href="mailto:komunalecprilep@yahoo.com"
            className="inline-flex items-center gap-1.5 text-[11px] text-blue-500 hover:underline">
            komunalecprilep@yahoo.com
            <ExternalLink size={10} />
          </a>
        </div>
      </AccordionSection>

    </div>
  );
}
