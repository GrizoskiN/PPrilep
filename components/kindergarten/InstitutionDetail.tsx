"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin, Phone, Clock, Users } from "lucide-react";
import { urlForImage } from "../../lib/sanity/image";
import type {
  KindergartenInstitution,
  StaffMember,
} from "../../lib/sanity/kindergarten";

type Tab = "info" | "staff";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "info",  label: "Инфо",     icon: <MapPin size={13} /> },
  { key: "staff", label: "Персонал", icon: <Users size={13} /> },
];

interface Props {
  institution: KindergartenInstitution;
  staff: StaffMember[];
}

export default function InstitutionDetail({ institution, staff }: Props) {
  const [tab, setTab] = useState<Tab>("info");

  const shortName = institution.name
    .replace(/Градинка\s*(„|"|")?Наша Иднина("|-|—|–)?\s*/i, "")
    .replace(/Kindergarten\s*["']Our Future["']\s*[-–—]?\s*/i, "")
    .trim() || institution.name;

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 sm:py-6 lg:px-5">

      {/* ── Header card ── */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {institution.coverImage ? (
          <div className="relative h-36 w-full sm:h-44">
            <Image
              src={urlForImage(institution.coverImage).width(800).height(300).url()}
              alt={institution.coverImage.alt ?? institution.name}
              fill
              sizes="(max-width: 640px) 100vw, 800px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-4">
              <h1 className="text-lg font-black text-white drop-shadow sm:text-xl">{shortName}</h1>
              {institution.district && <p className="text-xs text-white/80">{institution.district}</p>}
            </div>
          </div>
        ) : (
          <div className="flex h-20 items-center gap-3 px-5 bg-zinc-50 border-b border-zinc-100">
            <span className="text-3xl">🌸</span>
            <div>
              <h1 className="text-lg font-bold text-zinc-900">{shortName}</h1>
              {institution.district && <p className="text-xs text-zinc-500">{institution.district}</p>}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 px-4 py-2.5">
          {institution.phone && (
            <a href={`tel:${institution.phone.replace(/\s/g,"")}`}
               className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900">
              <Phone size={12} className="text-zinc-400" />{institution.phone}
            </a>
          )}
          {institution.closingTime && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock size={12} className="text-zinc-400" />до {institution.closingTime}
            </span>
          )}
          {institution.address && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <MapPin size={12} className="text-zinc-400" />{institution.address}
            </span>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.key
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === "info" && (
        <div className="space-y-3">
          {institution.description ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-sm leading-relaxed text-zinc-600 whitespace-pre-line">{institution.description}</p>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
              Нема додадено опис.
            </p>
          )}
          {institution.lat && institution.lng && (
            <a
              href={`https://www.google.com/maps?q=${institution.lat},${institution.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors">
              <MapPin size={14} className="text-zinc-400" />Отвори на Google Maps
            </a>
          )}
        </div>
      )}

      {tab === "staff" && (
        staff.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
            Нема додадено персонал.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {staff.map((s) => (
              <div key={s._id} className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-center">
                {s.photo ? (
                  <Image
                    src={urlForImage(s.photo).width(120).height(120).fit("crop").url()}
                    alt={s.name} width={56} height={56}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-zinc-100"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-xl font-bold text-zinc-500">
                    {s.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-zinc-900 leading-tight">{s.name}</p>
                  {s.role && <p className="text-[11px] text-zinc-400 mt-0.5">{s.role}</p>}
                </div>
              </div>
            ))}
          </div>
        )
      )}


    </div>
  );
}
