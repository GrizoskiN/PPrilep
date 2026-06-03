"use client";

import { useState } from "react";
import { ChevronDown, FileText, ExternalLink } from "lucide-react";
import { cn } from "../../lib/utils";

// ── Documents ──────────────────────────────────────────────────────────────────
const DOCUMENTS = [
  {
    label: "Состојба на водомер",
    sublabel: "Пријава за очитување",
    href: "https://vodovod-prilep.mk/wp-content/uploads/2019/04/%D0%A1%D0%BE%D1%81%D1%82%D0%BE%D1%98%D0%B1%D0%B0-%D0%BD%D0%B0-%D0%B2%D0%BE%D0%B4%D0%BE%D0%BC%D0%B5%D1%80.docx",
  },
  {
    label: "Барање за приклучок — водовод",
    sublabel: "Приклучување на водоводна мрежа",
    href: "https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2Fvodovod-prilep.mk%2Fwp-content%2Fuploads%2F2019%2F04%2F%25D0%2591%25D0%25B0%25D1%2580%25D0%25B0%25D1%259A%25D0%25B5-%25D0%25B7%25D0%25B0-%25D0%25BF%25D1%2580%25D0%25B8%25D0%25BA%25D0%25BB%25D1%2583%25D1%2587%25D0%25BE%25D0%25BA-%25D0%25B2%25D0%25BE-%25D0%25B2%25D0%25BE%25D0%25B4%25D0%25BE%25D0%25B2%25D0%25BE%25D0%25B4%25D0%25BD%25D0%25B0-%25D0%25BC%25D1%2580%25D0%25B5%25D0%25B6%25D0%25B0.doc&wdOrigin=BROWSELINK",
  },
  {
    label: "Потребни документи за нов корисник",
    sublabel: "Список на документи",
    href: "https://vodovod-prilep.mk/wp-content/uploads/2019/04/%D0%9F%D0%BE%D1%82%D1%80%D0%B5%D0%B1%D0%BD%D0%B8-%D0%B4%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D0%B8-%D0%B7%D0%B0-%D0%BD%D0%BE%D0%B2-%D0%BA%D0%BE%D1%80%D0%B8%D1%81%D0%BD%D0%B8%D0%BA.docx",
  },
  {
    label: "Барање за промена на податоци",
    sublabel: "Промена на сметкопримач",
    href: "https://vodovod-prilep.mk/wp-content/uploads/2019/04/%D0%91%D0%B0%D1%80%D0%B0%D1%9A%D0%B5-%D0%B7%D0%B0-%D0%BF%D1%80%D0%BE%D0%BC%D0%B5%D0%BD%D0%B0-%D0%BD%D0%B0-%D0%BF%D0%BE%D0%B4%D0%B0%D1%82%D0%BE%D1%86%D0%B8.pdf",
  },
  {
    label: "Барање да не се фактурира вода",
    sublabel: "Привремено непресметување",
    href: "https://vodovod-prilep.mk/wp-content/uploads/2019/04/%D0%91%D0%B0%D1%80%D0%B0%D1%9A%D0%B5-%D0%B4%D0%B0-%D0%BD%D0%B5-%D1%81%D0%B5-%D0%BF%D1%80%D0%B5%D1%81%D0%BC%D0%B5%D1%82%D1%83%D0%B2%D0%B0-%D0%B8-%D1%84%D0%B0%D0%BA%D1%82%D1%83%D1%80%D0%B8%D1%80%D0%B0-%D0%B2%D0%BE%D0%B4%D0%B0.doc",
  },
  {
    label: "Барање за исклучување од мрежа",
    sublabel: "Одјавување од водоводна мрежа",
    href: "https://vodovod-prilep.mk/wp-content/uploads/2019/04/%D0%91%D0%B0%D1%80%D0%B0%D1%9A%D0%B5-%D0%BD%D0%B0-%D0%B8%D1%81%D0%BA%D0%BB%D1%83%D1%87%D1%83%D0%B2%D0%B0%D1%9A%D0%B5-%D0%BE%D0%B4-%D0%B2%D0%BE%D0%B4%D0%BE%D0%B2%D0%BE%D0%B4%D0%BD%D0%B0-%D0%BC%D1%80%D0%B5%D0%B6%D0%B0.doc",
  },
  {
    label: "Пријава на дефект",
    sublabel: "Дефект на мрежа или водомер",
    href: "https://vodovod-prilep.mk/wp-content/uploads/2019/04/%D0%9F%D1%80%D0%B8%D1%98%D0%B0%D0%B2%D0%B0-%D0%BD%D0%B0-%D0%B4%D0%B5%D1%84%D0%B5%D0%BA%D1%82.docx",
  },
  {
    label: "Пријава за кражба на вода",
    sublabel: "Пријава за нелегална потрошувачка",
    href: "https://vodovod-prilep.mk/wp-content/uploads/2019/04/%D0%9F%D1%80%D0%B8%D1%98%D0%B0%D0%B2%D0%B0-%D0%B7%D0%B0-%D0%BA%D1%80%D0%B0%D0%B6%D0%B1%D0%B0-%D0%BD%D0%B0-%D0%B2%D0%BE%D0%B4%D0%B0.docx",
  },
];

// ── Prices ─────────────────────────────────────────────────────────────────────
const PRICES = [
  {
    service: "Водоснабдување — физички лица",
    price: "40,08 ден/м³",
    note: "+ 5% ДДВ",
  },
  {
    service: "Водоснабдување — правни лица",
    price: "58,11 ден/м³",
    note: "+ 5% ДДВ",
  },
  {
    service: "Одведување отпадни води",
    price: "6,48 ден/м³",
    note: "+ 5% ДДВ · сите корисници",
  },
  {
    service: "Прочистување отпадни води",
    price: "17,24 ден/м³",
    note: "+ 5% ДДВ · сите корисници",
  },
];

// ── Accordion section ──────────────────────────────────────────────────────────
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
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </span>
        <span className="flex-1 text-sm font-semibold text-zinc-900">{title}</span>
        <ChevronDown
          size={15}
          className={cn(
            "shrink-0 text-zinc-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="border-t border-zinc-100">{children}</div>}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function WaterInfoAccordion() {
  return (
    <div className="space-y-2.5">
      {/* Documents */}
      <AccordionSection
        title="Обрасци и документи"
        icon={<FileText size={14} />}>
        <div className="divide-y divide-zinc-50">
          {DOCUMENTS.map((doc) => (
            <a
              key={doc.href}
              href={doc.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500 group-hover:bg-blue-100 transition-colors">
                <FileText size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-zinc-800 leading-snug group-hover:text-blue-600 transition-colors">
                  {doc.label}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{doc.sublabel}</p>
              </div>
              <ExternalLink size={11} className="shrink-0 text-zinc-300 group-hover:text-blue-400 transition-colors" />
            </a>
          ))}
        </div>
      </AccordionSection>

      {/* Prices */}
      <AccordionSection
        title="Ценовник на услуги"
        icon={<span className="text-sm">💰</span>}>
        <div className="divide-y divide-zinc-50">
          {PRICES.map((row) => (
            <div
              key={row.service}
              className="flex items-start justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-zinc-800">{row.service}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{row.note}</p>
              </div>
              <span className="shrink-0 text-xs font-bold text-zinc-900 tabular-nums pt-0.5">
                {row.price}
              </span>
            </div>
          ))}
        </div>
      </AccordionSection>
    </div>
  );
}
