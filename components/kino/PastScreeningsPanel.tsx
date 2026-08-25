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
    // The middle column carries --app-pad-y; the panel column does not, so it
    // takes the same value here rather than a hand-picked margin that would
    // drift the moment the token changes.
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4"
      style={{ marginTop: "var(--app-pad-y)" }}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-theme-heading">
        <Popcorn size={16} className="text-primary" />
        Досега гледавме
      </h2>

      {screenings.length === 0 ? (
        <p className="mt-3 text-xs text-theme-muted">
          Штом ќе го одгледаме првиот филм, ќе се појави тука.
        </p>
      ) : (
        <ul className="mt-4 space-y-5">
          {screenings.map((s) => (
            <li key={s.id} className="flex flex-col items-center text-center">
              {s.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.poster_url}
                  alt=""
                  className="aspect-[16/9] w-full rounded-xl object-cover"
                />
              ) : (
                <span className="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                  <Popcorn size={22} />
                </span>
              )}
              <span className="mt-2 text-sm font-semibold text-theme-heading">
                {s.title}
              </span>
              <span className="text-xs text-theme-muted">
                {formatScreeningDate(s.screened_at)}
              </span>
              {s.note && (
                <span className="mt-1 text-xs text-theme-muted">{s.note}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
