/**
 * Right panel on /kino — the films we have already watched.
 *
 * Pure presentation: the layout fetches the list server-side and hands it down,
 * so the panel has no loading state of its own. With nothing in the archive yet
 * it says so rather than rendering an empty card.
 */

import { Popcorn } from "lucide-react";

import { formatScreeningDate, type PastScreening } from "../../lib/sanity/moviePoll";

export default function PastScreeningsPanel({
  screenings,
}: {
  screenings: PastScreening[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-theme-heading">
        <Popcorn size={16} className="text-primary" />
        Досега гледавме
      </h2>

      {screenings.length === 0 ? (
        <p className="mt-3 text-xs text-theme-muted">
          Штом ќе го одгледаме првиот филм, ќе се појави тука.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {screenings.map((s) => (
            <li key={s.id} className="flex gap-3">
              {s.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.poster_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                  <Popcorn size={16} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-theme-heading">
                  {s.title}
                </span>
                <span className="block text-xs text-theme-muted">
                  {formatScreeningDate(s.screened_at)}
                </span>
                {s.note && (
                  <span className="mt-0.5 block text-xs text-theme-muted">{s.note}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
