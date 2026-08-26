"use client";

/**
 * "Следни поаѓања" — the station's own times, flattened across carriers into one
 * chronological list, with everything that has already left today marked.
 *
 * ── Why this is a client component ───────────────────────────────────────────
 * The page is cached for an hour (`revalidate = 3600`), so a `now` computed on
 * the server would be up to sixty minutes stale — it would call a coach "gone"
 * that is still at the stand, which is the one mistake this list must not make.
 * The clock therefore comes from the browser, and the time is read in
 * Europe/Skopje explicitly so a phone set to another timezone doesn't shift it.
 */

import { useEffect, useState } from "react";

import { runsForDay, type TimetableLine } from "../../lib/data/timetable";

/** Weekday (0 = Sunday) and minutes-since-midnight, in Prilep. */
function prilepNow(): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Skopje",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export default function NextDepartures({
  destination,
  lines,
}: {
  destination: string;
  lines: TimetableLine[];
}) {
  // Seeded from the clock rather than from null: gating on an effect means the
  // list is missing entirely if hydration is delayed or fails, and a timetable
  // that renders nothing is worse than one that is a few minutes stale. On the
  // server this is the build-time clock (the page is cached for an hour); the
  // browser's very first render replaces it with the real one.
  const [now, setNow] = useState(prilepNow);

  useEffect(() => {
    setNow(prilepNow());
    // A minute is the resolution of the data; anything finer is wasted work.
    const id = setInterval(() => setNow(prilepNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!lines.length) return null;

  const today = runsForDay(destination, now.weekday);
  if (!today.length) return null;

  const next = today.find((r) => r.minutes > now.minutes);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-sm font-semibold text-theme-heading">
          Денешни поаѓања по ред
        </h2>
        {next ? (
          <span className="text-xs text-theme-muted">
            следно во{" "}
            <span className="font-bold tabular-nums text-teal-600">
              {next.run.time}
            </span>
          </span>
        ) : (
          <span className="text-xs text-theme-muted">
            нема повеќе поаѓања денес
          </span>
        )}
      </div>

      <ul suppressHydrationWarning className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {today.map(({ line, run, minutes }) => {
          const gone = minutes <= now.minutes;
          const isNext = next?.line.id === line.id && next.run.time === run.time;
          return (
            <li
              key={`${line.id}-${run.time}`}
              className={`flex items-center gap-4 px-4 py-3 ${
                isNext ? "bg-teal-50/60" : ""
              }`}
            >
              {/* A departure that has gone is struck through and red, not
                  hidden: seeing that the 05:30 exists tells you to come back
                  tomorrow, and hiding it looks like the coach was cancelled. */}
              <span
                title={gone ? "Овој автобус веќе тргна денес." : undefined}
                className={`text-base font-extrabold tabular-nums ${
                  gone
                    ? "cursor-help text-red-400 line-through"
                    : "text-theme-heading"
                }`}
              >
                {run.time}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-theme-muted">
                {line.carrier}
                {line.carrierOrigin ? (
                  <span className="ml-1 text-xs text-zinc-400">
                    ({line.carrierOrigin})
                  </span>
                ) : null}
              </span>
              {isNext ? (
                <span className="shrink-0 rounded-full bg-teal-600 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
                  Следен
                </span>
              ) : line.fare.oneWay !== null ? (
                <span className="shrink-0 text-xs font-semibold tabular-nums text-theme-muted">
                  {line.fare.oneWay} ден.
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
