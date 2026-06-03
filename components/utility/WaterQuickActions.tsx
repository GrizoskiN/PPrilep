import { CreditCard, Phone, Wrench, Globe } from "lucide-react";

const PAYMENT_URL = "https://vik-prilep.mk/Login.aspx?ReturnUrl=%2f";
const DEFECT_FORM_URL = "https://vodovod-prilep.mk/wp-content/uploads/2019/04/%D0%9F%D1%80%D0%B8%D1%98%D0%B0%D0%B2%D0%B0-%D0%BD%D0%B0-%D0%B4%D0%B5%D1%84%D0%B5%D0%BA%D1%82.docx";
const PHONE = "+38948421775"; // raw digits for tel: href
const PHONE_DISPLAY = "+389 48 421 775";

export default function WaterQuickActions() {
  return (
    <div className="space-y-3">

      {/* ── Pay bill CTA ─────────────────────────────────────────────────────── */}
      <a
        href={PAYMENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all active:scale-[0.99]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 group-hover:bg-white/30 transition-colors">
          <CreditCard size={22} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white leading-tight">
            Плати Сметка Онлајн
          </p>
          <p className="text-xs text-blue-100 mt-0.5 leading-snug">
            Брза и безбедна наплата на Вашите фактури за вода
          </p>
        </div>
        <Globe size={16} className="shrink-0 text-blue-200 group-hover:text-white transition-colors" />
      </a>

      {/* ── Emergency contacts ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Call button */}
        <a
          href={`tel:${PHONE}`}
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-4 text-center shadow-sm hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-[0.98]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
            <Phone size={18} className="text-emerald-700" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-zinc-900 leading-tight">
              Централа
            </p>
            <p className="text-sm font-bold text-emerald-700 tabular-nums mt-0.5">
              {PHONE_DISPLAY}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Повикај директно</p>
          </div>
        </a>

        {/* Report defect button */}
        <a
          href={DEFECT_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-4 text-center shadow-sm hover:border-orange-200 hover:bg-orange-50 transition-all active:scale-[0.98]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 group-hover:bg-orange-200 transition-colors">
            <Wrench size={18} className="text-orange-700" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-zinc-900 leading-tight">
              Пријави Дефект
            </p>
            <p className="text-[10px] text-zinc-500 mt-1 leading-snug">
              Преземи образец за пријава
            </p>
          </div>
        </a>
      </div>

    </div>
  );
}
