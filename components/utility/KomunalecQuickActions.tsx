import { CreditCard, Phone, Trash2 } from "lucide-react";

const PAYMENT_URL = "https://www.esmetka-jkp.com.mk/Login.aspx?ReturnUrl=%2fPayment.aspx";
const STRAY_PHONE = "+38976207113";
const STRAY_PHONE_DISPLAY = "076/207-113";
const MAIN_PHONE = "+38948428992";
const MAIN_PHONE_DISPLAY = "048/428-992";

export default function KomunalecQuickActions() {
  return (
    <div className="space-y-3">

      {/* ── Pay bill CTA ─────────────────────────────────────────────────────── */}
      <a
        href={PAYMENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ backgroundColor: "#008976" }}
        className="group flex items-center gap-4 rounded-2xl p-4 shadow-sm transition-all hover:brightness-95 active:scale-[0.99]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 group-hover:bg-white/30 transition-colors">
          <CreditCard size={22} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white leading-tight">
            Плати Сметка Онлајн
          </p>
          <p className="text-xs text-emerald-100 mt-0.5 leading-snug">
            Брза наплата на фактури за комунални услуги
          </p>
        </div>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-emerald-200 group-hover:fill-white transition-colors" aria-hidden>
          <path d="M10 6v2H5v11h11v-5h2v7H3V6h7zm11-3v8h-2V6.413l-7.793 7.794-1.414-1.414L17.585 5H13V3h8z"/>
        </svg>
      </a>

      {/* ── Quick contact grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Main line */}
        <a
          href={`tel:${MAIN_PHONE}`}
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-4 text-center shadow-sm hover:border-emerald-200 hover:bg-emerald-50 transition-all active:scale-[0.98]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
            <Phone size={18} className="text-emerald-700" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-zinc-900 leading-tight">Централа</p>
            <p className="text-sm font-bold text-emerald-700 tabular-nums mt-0.5">{MAIN_PHONE_DISPLAY}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Повикај директно</p>
          </div>
        </a>

        {/* Stray dogs report */}
        <a
          href={`tel:${STRAY_PHONE}`}
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-4 text-center shadow-sm hover:border-amber-200 hover:bg-amber-50 transition-all active:scale-[0.98]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 group-hover:bg-amber-200 transition-colors">
            <Trash2 size={18} className="text-amber-700" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-zinc-900 leading-tight">Пријави бездомно куче</p>
            <p className="text-sm font-bold text-amber-700 tabular-nums mt-0.5">{STRAY_PHONE_DISPLAY}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Дежурен број</p>
          </div>
        </a>
      </div>

    </div>
  );
}
