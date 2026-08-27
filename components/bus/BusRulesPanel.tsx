"use client";

import { useState } from "react";
import { ChevronDown, FileText, ShieldCheck } from "lucide-react";

/**
 * The station's terms & rules, condensed, shown in the right panel on
 * /bus-station. The full legal text lives in the linked PDF (served from the
 * site root out of `public/`); this is the plain-language digest. Kept in sync
 * with the mobile "Правила" popup (mojprilep-mobile bus-station.tsx) and with
 * public/Информации…Прилеп.pdf.
 */

const RULES_PDF_URL =
  "/" + encodeURIComponent("Информации за фунционирање на Автобуска станица Прилеп.pdf");

const INSPECTORATE_EMAIL = "prijavi@dti.gov.mk";

const RULES: { title: string; body: string }[] = [
  {
    title: "Качување и слегување само на станица и стојалишта",
    body: "Според Член 34 од Законот за превоз во патниот сообраќај, качување и слегување на патници се врши само на автобуски станици и стојалишта запишани во возниот ред. Ова е поради безбедност — секој патник е евидентиран и снимен со камери.",
  },
  {
    title: "Билетот носи и осигурување",
    body: "Со купен или заверен повратен билет добивате место за седење и колективно осигурување на автобусот. Патник без билет не е осигуран и не е запишан во описот на патници, што е основ за исплата на штета при несреќа.",
  },
  {
    title: "Контрола и казни",
    body: "При инспекциска контрола, патник без важечки билет се казнува со најмалку 50 евра на лице место, а превозникот со 5.000 евра.",
  },
  {
    title: "Не можете навреме до станицата?",
    body: "Избегнувајте нерегулирано качување низ градот. Ако сте спречени да стигнете навреме, јавете се на телефонот на станицата за да ви се издаде уреден билет.",
  },
  {
    title: "Пратки по автобус",
    body: "Транспортот на пратки е делумно регулиран поради безбедност (непозната содржина може да е опасна). Пратките се примаат со влезен житон и фискална сметка; можно е и испраќање и подигање без ваше присуство.",
  },
  {
    title: "Станична услуга",
    body: "Цената на билетот вклучува станична (посредничка) услуга според должината на рутата, регулирана со закон. Цената ја определува компанијата-сопственик на станицата со одлука.",
  },
  {
    title: "Пријави неправилности",
    body: `Нерегуларно качување или транспорт можете да пријавите во Државниот инспекторат за транспорт на ${INSPECTORATE_EMAIL}.`,
  },
];

/** Collapsed, only the first few rules show — the rest sit behind "Прочитај повеќе". */
const PREVIEW_COUNT = 2;

export default function BusRulesPanel() {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? RULES : RULES.slice(0, PREVIEW_COUNT);
  const hiddenCount = RULES.length - PREVIEW_COUNT;

  return (
    <div className="space-y-4 lg:p-3">
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-teal-500" />
          <p className="text-sm font-semibold text-zinc-500">Правила на станицата</p>
        </div>

        <p className="text-xs leading-relaxed text-theme-muted">
          Најважното од официјалниот документ за функционирање на Автобуска станица Прилеп.
        </p>

        <div className="space-y-3">
          {shown.map((r, i) => (
            <div key={i} className="space-y-0.5">
              <p className="text-[13px] font-bold text-theme-heading">{r.title}</p>
              <p className="text-xs leading-relaxed text-theme-muted">{r.body}</p>
            </div>
          ))}
        </div>

        {!expanded && hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1 text-xs font-bold text-teal-600 transition-colors hover:text-teal-700"
          >
            Прочитај повеќе ({hiddenCount})
            <ChevronDown size={13} />
          </button>
        ) : null}

        <a
          href={RULES_PDF_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-teal-600 px-3 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-teal-700"
        >
          <FileText size={15} className="shrink-0" />
          Целосен документ (PDF)
        </a>

        <p className="text-[11px] leading-relaxed text-zinc-400">
          Извор: ДТШУ „Пелагонија Бус“ ДООЕЛ Прилеп — сопственик на автобуската станица.
        </p>
      </div>
    </div>
  );
}
