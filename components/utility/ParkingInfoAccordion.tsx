"use client";

/**
 * Reference information for ЈП за ПУП's paid parking — currently the terms for a
 * resident permit (повластен билет за паркирање).
 *
 * The twin of the "Повластени билети" section in the app's parking screen
 * (mojprilep-mobile/src/app/parking.tsx). KEEP THE WORDING IN SYNC — these are
 * the operator's conditions, and two different summaries of the same rules is
 * how people end up at the counter with the wrong documents.
 *
 * We link the operator's own form rather than mirroring it: the conditions and
 * the contract are theirs to change, and a stale copy of a contract is worse
 * than no copy.
 */

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "../../lib/utils";

const PERMIT_FORM_URL =
  "https://www.parkingprilep.com/documents/%D0%91%D0%90%D0%A0%D0%90%D0%8A%D0%95-%D0%94%D0%9E%D0%93%D0%9E%D0%92%D0%9E%D0%A0%D0%B7%D0%B0%D0%9F%D0%9E%D0%92%D0%9B%D0%90%D0%A1%D0%A2%D0%95%D0%9D%D0%90-%D0%9F%D0%90%D0%A0%D0%9A%D0%98%D0%9D%D0%93-%D0%9A%D0%90%D0%A0%D0%A2%D0%90-%D0%92%D0%90%D0%96%D0%98-%D0%88%D0%9F%D0%9F%D0%A3%D0%9F20.12.2018.doc";

export default function ParkingInfoAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
          <span className="text-sm">🎫</span>
        </span>
        <span className="flex-1 text-sm font-semibold text-zinc-900">
          Повластени билети
        </span>
        <ChevronDown
          size={15}
          className={cn("shrink-0 text-zinc-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-zinc-100 px-4 py-4">
          <p className="text-sm leading-relaxed text-zinc-600">
            Право на користење на повластен билет за паркирање (ПБП) имаат
            станарите на улицата на која се врши наплата на надоместок за
            користење на паркинг простор.
          </p>
          <p className="text-sm leading-relaxed text-zinc-600">
            Во наредниот период се планира ПБП да се воведе и за правни лица,
            сопственици на недвижнини и трговци поединци кои имаат или користат
            деловен простор во зоната во која се наплаќа надоместок за користење
            на паркинг простор.
          </p>
          <p className="text-sm leading-relaxed text-zinc-600">
            На повластениот билет за паркирање не се применува ограничување на
            времетраењето на паркирање, а истиот се издава за период до 12
            месеци.
          </p>

          <a
            href={PERMIT_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700">
            Барање - договор (.doc)
            <ExternalLink size={15} className="shrink-0" />
          </a>

          <p className="text-xs leading-relaxed text-zinc-400">
            Условите и барањето се на ЈП за просторни и урбанистички планови —
            Прилеп. Документот се презема од parkingprilep.com.
          </p>
        </div>
      )}
    </div>
  );
}
