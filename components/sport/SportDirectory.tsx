"use client";

/**
 * The club list with its search box and filter chips.
 *
 * A client component so filtering is instant — the whole directory is a few
 * dozen clubs, so it is fetched once on the server and narrowed in the browser
 * rather than round-tripping for every keystroke.
 */

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, MapPin, BadgeCheck } from "lucide-react";

import { urlForImage } from "../../lib/sanity/image";
import {
  AGE_LABEL,
  KIND_LABEL,
  sportsIn,
  type SportClubCard,
} from "../../lib/sanity/sport";

/** The age filter is a fixed order — chips that jump around are hard to aim at. */
const AGE_ORDER = ["4-6", "7-11", "12-15", "16-18", "18+", "recreation", "veterans"];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-teal-600 text-white"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function ClubCard({ club }: { club: SportClubCard }) {
  return (
    <Link
      href={`/sport/${club.slug}`}
      className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-3 transition-colors hover:border-teal-300"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100">
        {club.logo ? (
          <Image
            src={urlForImage(club.logo).width(112).height(112).fit("crop").url()}
            alt={club.name}
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xl">🏅</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <h3 className="min-w-0 flex-1 text-sm font-bold leading-snug text-theme-heading">
            {club.name}
          </h3>
          {club.verified ? (
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          ) : null}
        </div>

        <p className="truncate text-xs text-theme-muted">
          {(club.sports ?? []).join(", ") || KIND_LABEL[club.kind]}
        </p>

        {club.shortDescription ? (
          <p className="mt-1 line-clamp-2 text-xs text-theme-muted">
            {club.shortDescription}
          </p>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {club.district ? (
            <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
              <MapPin className="h-3 w-3" />
              {club.district}
            </span>
          ) : null}
          {club.freeTrial ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
              Прв тренинг бесплатно
            </span>
          ) : null}
          {/* Only the negative case is worth a badge: "прима членови" is the
              assumption, "не прима" is the thing that saves a phone call. */}
          {club.acceptingMembers ? null : (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
              Уписот е затворен
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function SportDirectory({ clubs }: { clubs: SportClubCard[] }) {
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);

  const sports = useMemo(() => sportsIn(clubs), [clubs]);
  const ages = useMemo(
    () => AGE_ORDER.filter((a) => clubs.some((c) => (c.ageGroups ?? []).includes(a))),
    [clubs],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("mk");
    return clubs.filter((club) => {
      if (sport && !(club.sports ?? []).some((s) => s.toLocaleLowerCase("mk") === sport))
        return false;
      if (age && !(club.ageGroups ?? []).includes(age)) return false;
      if (!needle) return true;
      const haystack = [club.name, club.shortDescription, club.district, ...(club.sports ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("mk");
      return haystack.includes(needle);
    });
  }, [clubs, query, sport, age]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Пребарај клуб или спорт…"
          className="w-full bg-transparent text-sm text-theme-heading outline-none placeholder:text-zinc-400"
        />
      </div>

      {sports.length > 1 ? (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={sport === null} onClick={() => setSport(null)}>
            Сите спортови
          </Chip>
          {sports.map((s) => (
            <Chip key={s} active={sport === s} onClick={() => setSport(sport === s ? null : s)}>
              {s}
            </Chip>
          ))}
        </div>
      ) : null}

      {ages.length > 1 ? (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={age === null} onClick={() => setAge(null)}>
            Сите возрасти
          </Chip>
          {ages.map((a) => (
            <Chip key={a} active={age === a} onClick={() => setAge(age === a ? null : a)}>
              {AGE_LABEL[a] ?? a}
            </Chip>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-theme-muted">
          Нема клуб што одговара на пребарувањето.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((club) => (
            <ClubCard key={club._id} club={club} />
          ))}
        </div>
      )}
    </div>
  );
}
