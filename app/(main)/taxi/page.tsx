import type { Metadata } from "next";
import { faCarSide, faPhone } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { TAXI_COMPANIES } from "../../../lib/data/taxi";

export const metadata: Metadata = {
  title: "Такси во Прилеп — сите превозници и позивни броеви | Мој Прилеп",
  description:
    "Список со такси компаниите во Прилеп и нивните позивни броеви. Кликни на бројот за да се јавиш веднаш.",
  alternates: { canonical: "/taxi" },
  openGraph: {
    title: "Такси во Прилеп",
    description:
      "Сите такси превозници во Прилеп на едно место, со позивните броеви што ги бираш.",
    url: "/taxi",
    type: "article",
  },
};

export default function TaxiPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-theme-heading">🚖 Такси во Прилеп</h1>
        <p className="text-sm text-theme-muted">
          Сите такси превозници во градот на едно место. Кликни на компанија за
          да се јавиш веднаш.
        </p>
      </header>

      {TAXI_COMPANIES.length ? (
        <ul className="space-y-2.5">
          {TAXI_COMPANIES.map((company) => {
            // The short code is what the sign on the car shows and what people
            // say out loud; the full number is the fallback for roamers.
            const dial = (company.shortCode || company.phone || "").replace(/\s/g, "");
            return (
              <li key={company.shortCode || company.name}>
                {/* The whole row is the call target — this page exists for one
                    action, and on a phone in the rain nobody should have to aim
                    at a small link. */}
                <a
                  href={`tel:${dial}`}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-teal-300 hover:bg-teal-50/40 outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                    <FontAwesomeIcon icon={faCarSide} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-theme-heading">
                      {company.name}
                    </span>
                    {company.note ? (
                      <span className="block text-xs text-theme-muted">{company.note}</span>
                    ) : null}
                    {company.shortCode && company.phone ? (
                      <span className="block text-xs text-zinc-400">{company.phone}</span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-2 text-[15px] font-extrabold tabular-nums text-teal-600">
                    {/* The short code when there is one, otherwise the number
                        itself — the badge is the thing you dial either way. */}
                    {company.shortCode ?? company.phone}
                    <FontAwesomeIcon icon={faPhone} className="h-3 w-3" />
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 px-8 py-14 text-center">
          <FontAwesomeIcon icon={faCarSide} className="h-8 w-8 text-zinc-300" />
          <p className="max-w-sm text-sm leading-relaxed text-theme-muted">
            Списокот со такси компании наскоро ќе биде достапен. Ги собираме
            броевите директно од превозниците — подобро празна страница отколку
            погрешен број.
          </p>
        </div>
      )}
    </div>
  );
}
