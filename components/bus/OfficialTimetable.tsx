/**
 * The station's own timetable for one destination.
 *
 * Rendered ABOVE the portal-driven list, because these numbers come from the
 * station itself and carry the fares the portal has no field for. The portal
 * list stays below rather than being replaced: it covers every destination,
 * while this covers only the routes transcribed so far (see lib/data/timetable.ts).
 *
 * The twin of the app's section — keep the wording in sync.
 */

import { faTicket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { TICKETS_URL } from "../../lib/busStation";
import {
  TIMETABLE_EFFECTIVE_LABEL,
  type Fare,
  type TimetableLine,
} from "../../lib/data/timetable";

/**
 * One fare cell. A price the sheet doesn't list is omitted, never shown as 0.
 *
 * The label is held to a single line: "Повратна студентска" wraps at this size
 * otherwise, and a two-line label next to three one-line ones makes the row of
 * prices look ragged. Small text plus tight tracking buys the width instead.
 */
function Price({
  label,
  value,
  student,
}: {
  label: string;
  value: number | null;
  student?: boolean;
}) {
  if (value === null) return null;
  return (
    <div
      className={`rounded-xl px-2 py-2 text-center ${
        student ? "bg-teal-50" : "bg-zinc-50"
      }`}
    >
      <div
        className={`whitespace-nowrap text-[9px] font-semibold uppercase tracking-tight ${
          student ? "text-teal-600" : "text-zinc-400"
        }`}
      >
        {label}
      </div>
      <div className="text-sm font-bold tabular-nums text-theme-heading">
        {value} ден.
      </div>
    </div>
  );
}

/**
 * Student fares lead. Most people reading a Prilep→Skopje timetable are
 * students commuting to university, and it is the cheaper number they are
 * looking for — burying it behind the full fare makes them do the scanning.
 */
function Fares({ fare }: { fare: Fare }) {
  // Ресен is priced only as far as Охрид on the station's sheet, so its rows
  // carry no fare at all. An empty gap under the times reads as a bug; saying
  // where the number lives is more use than showing nothing.
  if (Object.values(fare).every((v) => v === null)) {
    return (
      <p className="text-xs text-theme-muted">
        Цената за оваа делница не е објавена — прашај на станицата.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Price label="Студентска" value={fare.oneWayStudent} student />
      <Price label="Студ. повратна" value={fare.roundTripStudent} student />
      <Price label="Во еден правец" value={fare.oneWay} />
      <Price label="Повратен" value={fare.roundTrip} />
    </div>
  );
}

export default function OfficialTimetable({
  destination,
  lines,
}: {
  destination: string;
  lines: TimetableLine[];
}) {
  if (!lines.length) return null;

  // Each legend appears only when something on screen actually needs it.
  const hasSunday = lines.some((l) => l.runs.some((r) => r.sunday));
  const hasWeekday = lines.some((l) => l.runs.some((r) => r.weekdaysOnly));

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-theme-heading">
          Официјален возен ред — Прилеп → {destination}
        </h2>
        {/* Stated, not hidden: these are the station's numbers for the new
            schedule, and reading them as today's would put someone at the
            wrong stand. */}
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-600">
          Важи од {TIMETABLE_EFFECTIVE_LABEL}
        </span>
      </div>

      <ul className="space-y-3">
        {lines.map((line) => (
          <li
            key={line.id}
            className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <span className="text-sm font-semibold text-theme-heading">
                  {line.carrier}
                  {line.carrierOrigin ? (
                    <span className="ml-1 text-xs font-normal text-zinc-400">
                      ({line.carrierOrigin})
                    </span>
                  ) : null}
                  {/* Which country the destination is in — a passport question
                      before it is a timetable one. */}
                  {line.country ? (
                    <span className="ml-1.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600">
                      {line.country}
                    </span>
                  ) : null}
                </span>
                {line.via || line.note ? (
                  <span className="block truncate text-xs text-theme-muted">
                    {[line.note, line.via].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </div>
              <a
                href={TICKETS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-600 transition-colors hover:bg-teal-100"
              >
                <FontAwesomeIcon icon={faTicket} className="h-3 w-3" />
                Купи билет
              </a>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {line.runs.map((r) => (
                // Every time reads at the same strength — a Sunday departure
                // is not a lesser departure. The star is the marker, carried in
                // brand colour on a tinted chip; the digits never dim.
                <span
                  key={r.time}
                  className={`rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums text-theme-heading ${
                    r.sunday ? "bg-teal-50" : "bg-zinc-100"
                  }`}
                >
                  {r.time}
                  {r.sunday ? (
                    <span className="ml-0.5 font-extrabold text-teal-600">*</span>
                  ) : null}
                  {/* Spelled out rather than starred: a second symbol next to
                      the Sunday one would need decoding, and these are the
                      exceptions a traveller most needs to catch — a coach that
                      leaves once a week is useless information without them. */}
                  {r.days || r.weekdaysOnly ? (
                    <span className="ml-1 text-[10px] font-bold uppercase text-indigo-600">
                      {r.days ?? "пон–пет"}
                    </span>
                  ) : null}
                </span>
              ))}
            </div>

            <Fares fare={line.fare} />
          </li>
        ))}
      </ul>

      {/* The legends are not fine print — without them the markers are
          meaningless, so they carry the weight of the chips they explain. */}
      {hasSunday ? (
        <p className="text-xs font-semibold text-teal-700">
          * — автобуски линии што возат и во недела.
        </p>
      ) : null}
      {hasWeekday ? (
        <p className="text-xs font-semibold text-indigo-600">
          пон–пет — линијата вози само од понеделник до петок.
        </p>
      ) : null}
    </section>
  );
}
