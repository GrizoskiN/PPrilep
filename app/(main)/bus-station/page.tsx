import type { Metadata } from "next";
import Link from "next/link";
import {
  faPhone,
  faTicket,
  faBusSimple,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  fetchDepartures,
  fetchStations,
  padTime,
  splitCarrier,
  STATION_EMAIL,
  STATION_PHONE,
  TICKETS_URL,
} from "../../../lib/busStation";
import { allDestinations, linesTo } from "../../../lib/data/timetable";
import OfficialTimetable from "../../../components/bus/OfficialTimetable";
import NextDepartures from "../../../components/bus/NextDepartures";

export const metadata: Metadata = {
  title: "Автобуска станица Прилеп — возен ред | Мој Прилеп",
  description:
    "Меѓуградски и меѓународни автобуски линии од Автобуската станица во Прилеп — поаѓања, превозници и цени на билети.",
  alternates: { canonical: "/bus-station" },
  openGraph: {
    title: "Возен ред — Автобуска станица Прилеп",
    description:
      "Поаѓања од Прилеп кон Скопје, Битола, Охрид и останатите дестинации, со превозник и цена.",
    url: "/bus-station",
    type: "article",
  },
};

// The upstream timetable changes rarely and the API is a third party's, so the
// page is cached for an hour rather than hitting them on every visit.
export const revalidate = 3600;

const POPULAR = ["Скопје", "Битола", "Охрид", "Кичево", "Велес", "Белград"];

/**
 * Shown when nothing has been searched yet. Skopje is far and away the most
 * asked-for destination at this station, so landing on an empty screen wastes
 * the one interaction most visitors were going to make anyway.
 */
const DEFAULT_DESTINATION = "Скопје";

export default async function BusStationPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; day?: string }>;
}) {
  const { to, day } = await searchParams;
  const destination = (to ?? "").trim() || DEFAULT_DESTINATION;
  /**
   * Whether we hold the station's OWN timetable for this destination. When we
   * do, it is the only thing shown: the portal disagrees with it on times
   * (15:30 against the sheet's 15:15) and prints pass-through minutes for
   * пролазни coaches, so showing both made the official numbers look wrong.
   */
  const sheetLines = linesTo(destination);
  const hasSheet = sheetLines.length > 0;
  /** Where you can actually get to — our own list, not the portal's 137. */
  const destinations = allDestinations();
  const tomorrow = day === "tomorrow";

  // Both requests run on the SERVER on purpose: pelagonija.mk sends no CORS
  // headers, so the same fetch from the browser would be blocked outright.
  const when = new Date();
  if (tomorrow) when.setDate(when.getDate() + 1);

  // The portal is only consulted for destinations the station's sheet doesn't
  // cover. Where we have the sheet its numbers are the answer, so there is
  // nothing to gain from a third-party request whose times contradict it.
  const [stations, departures] = await Promise.all([
    fetchStations(),
    destination && !hasSheet
      ? fetchDepartures(destination, when)
      : Promise.resolve([]),
  ]);

  const dayHref = (d: "today" | "tomorrow") =>
    `/bus-station?to=${encodeURIComponent(destination)}&day=${d}`;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-theme-heading">
          🚌 Автобуска станица Прилеп
        </h1>
        <p className="text-sm text-theme-muted">
          Меѓуградски и меѓународни поаѓања. Избери дестинација за да го видиш
          возниот ред.
        </p>
      </header>

      {/* Station contact — the fallback whenever the timetable can't be loaded,
          and the answer to everything the timetable doesn't cover. */}
      <section className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white p-4">
        <a
          href={`tel:${STATION_PHONE.replace(/\s/g, "")}`}
          className="flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm font-bold text-teal-600 transition-colors hover:bg-teal-100"
        >
          <FontAwesomeIcon icon={faPhone} className="h-3.5 w-3.5" />
          {STATION_PHONE}
        </a>
        <a
          href={TICKETS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-theme-muted transition-colors hover:border-teal-300 hover:text-teal-600"
        >
          <FontAwesomeIcon icon={faTicket} className="h-3.5 w-3.5" />
          Купи билет
        </a>
        <a
          href={`mailto:${STATION_EMAIL}`}
          className="text-xs text-zinc-400 transition-colors hover:text-teal-600"
        >
          {STATION_EMAIL}
        </a>
      </section>

      {/* Destination picker. A plain GET form so it works without JavaScript
          and every result is a shareable, cacheable URL. */}
      <section className="space-y-3">
        <form action="/bus-station" className="flex gap-2">
          <input
            type="search"
            name="to"
            list="bus-stations"
            defaultValue={destination}
            placeholder="Кон каде патуваш?"
            aria-label="Дестинација"
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus-visible:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-100"
          />
          {tomorrow ? <input type="hidden" name="day" value="tomorrow" /> : null}
          <button
            type="submit"
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700"
          >
            Барај
          </button>
        </form>
        {/* All 137 stations the portal serves, as native autocomplete. */}
        <datalist id="bus-stations">
          {stations.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <div className="flex flex-wrap gap-2">
          {POPULAR.map((city) => (
            <Link
              key={city}
              href={`/bus-station?to=${encodeURIComponent(city)}${tomorrow ? "&day=tomorrow" : ""}`}
              className={
                city === destination
                  ? "rounded-full bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white"
                  : "rounded-full border border-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-theme-muted transition-colors hover:border-teal-300 hover:text-teal-600"
              }
            >
              {city}
            </Link>
          ))}
        </div>

        {/* The chips answer "is my usual coach running"; this answers "where can
            I even go from here", which the search box can't — it only helps
            someone who already knows the name. A <details> so it costs no
            JavaScript and the closed state is the default. */}
        {destinations.length ? (
          <details className="group rounded-2xl border border-zinc-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-theme-muted transition-colors hover:text-teal-600">
              Сите дестинации ({destinations.length})
              <FontAwesomeIcon
                icon={faChevronDown}
                className="h-3 w-3 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-zinc-100 px-4 py-3 sm:grid-cols-3 md:grid-cols-4">
              {destinations.map((s) => (
                <Link
                  key={s}
                  href={`/bus-station?to=${encodeURIComponent(s)}${tomorrow ? "&day=tomorrow" : ""}`}
                  className="truncate py-1 text-sm text-theme-muted transition-colors hover:text-teal-600"
                >
                  {s}
                </Link>
              ))}
            </div>
          </details>
        ) : null}
      </section>

      {/* The station's own sheet first, where we have it — it carries student
          and return fares the portal's API has no field for. */}
      {destination ? (
        <>
          <OfficialTimetable destination={destination} lines={sheetLines} />
          {/* The grouped view above answers "what does Роман run"; this answers
              "what is the next bus", which is what most visits are actually
              about. Same data, ordered by the clock instead of by carrier. */}
          <NextDepartures destination={destination} lines={sheetLines} />
        </>
      ) : null}

      {/* Shown ONLY where we have no sheet of our own. pelagonija publishes the
          minute a Пролазна coach passes THROUGH Prilep (12:47, 18:29), hides
          every departure that has already left today, and disagrees with the
          station on scheduled times — useful as the only source for a
          destination we haven't transcribed, misleading next to one we have. */}
      {destination && !hasSheet ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-theme-heading">
              Прилеп → {destination}
            </h2>

            <div className="flex overflow-hidden rounded-full border border-zinc-200">
              <Link
                href={dayHref("today")}
                className={
                  tomorrow
                    ? "px-3.5 py-1.5 text-xs font-semibold text-theme-muted hover:text-teal-600"
                    : "bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white"
                }
              >
                Денес
              </Link>
              <Link
                href={dayHref("tomorrow")}
                className={
                  tomorrow
                    ? "bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white"
                    : "px-3.5 py-1.5 text-xs font-semibold text-theme-muted hover:text-teal-600"
                }
              >
                Утре
              </Link>
            </div>
          </div>

          {departures.length ? (
            <ul className="space-y-2">
              {departures.map((d) => {
                const carrier = splitCarrier(d.carrierName);
                return (
                <li
                  key={d.id}
                  className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <span className="text-lg font-extrabold tabular-nums text-teal-600">
                    {padTime(d.departureTime)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-theme-heading">
                      {carrier.name}
                      {/* The home town only says which company this is — it is
                          not a stop on the route, so it must not read like one. */}
                      {carrier.origin ? (
                        <span className="ml-1 text-xs font-normal text-zinc-400">
                          ({carrier.origin})
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-theme-muted">
                      {d.routeName}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {d.transportType ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-500">
                          {d.transportType}
                        </span>
                      ) : null}
                      {/* Worth calling out in red: a "пролазна" coach starts
                          somewhere else and only calls at Prilep, so it can
                          arrive late and the seats may already be sold. The
                          title carries that explanation on hover, because the
                          word alone means nothing to someone who doesn't
                          already know the term. */}
                      {d.lineType === "Пролазна" ? (
                        <span
                          title="Пролазна линија — автобусот тргнува од друг град и само поминува низ Прилеп. Може да доцни, а местата да бидат веќе продадени."
                          className="cursor-help rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600"
                        >
                          Пролазна
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {/* Price + the buy link, stacked so the row stays one line
                      tall on a phone. The link is the same portal as the button
                      at the top of the page — pelagonija.mk publishes no
                      per-route URL we could deep-link to, so every ticket
                      button lands on the search form. */}
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    {d.singleTicketPrice ? (
                      <span className="text-sm font-bold tabular-nums text-theme-heading">
                        {d.singleTicketPrice} ден.
                      </span>
                    ) : null}
                    <a
                      href={TICKETS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-600 transition-colors hover:bg-teal-100"
                    >
                      <FontAwesomeIcon icon={faTicket} className="h-3 w-3" />
                      Купи билет
                    </a>
                  </span>
                </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 px-8 py-12 text-center">
              <FontAwesomeIcon icon={faBusSimple} className="h-8 w-8 text-zinc-300" />
              <p className="max-w-sm text-sm leading-relaxed text-theme-muted">
                Нема пронајдени поаѓања за оваа дестинација
                {tomorrow ? " утре" : " денес"}. Провери го името на местото или
                јави се на станицата.
              </p>
            </div>
          )}
        </section>
      ) : null}

      <p className="text-xs leading-relaxed text-zinc-400">
        Возниот ред е преземен од продажниот портал на превозниците и може да се
        разликува од фактичката состојба. За потврда јави се на{" "}
        <a href={`tel:${STATION_PHONE.replace(/\s/g, "")}`} className="underline">
          {STATION_PHONE}
        </a>
        .
      </p>
    </div>
  );
}
