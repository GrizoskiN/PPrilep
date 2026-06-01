"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, Clock, MapPin } from "lucide-react";
import { urlForImage } from "../../../lib/sanity/image";
import {
  fetchAllInstitutions,
  fetchAllAnnouncements,
  type KindergartenInstitution,
  type KindergartenAnnouncement,
} from "../../../lib/sanity/kindergarten";
import { INSTITUTION_FALLBACK } from "../../../lib/kindergarten-fallback";
import { formatDays } from "../../../lib/utils";

function mergeWithSanity(fb: typeof INSTITUTION_FALLBACK[0], sanity?: KindergartenInstitution) {
  if (!sanity) return { ...fb, coverImage: null as KindergartenInstitution["coverImage"] };
  return {
    ...fb,
    address:     sanity.address     ?? fb.address,
    phone:       sanity.phone       ?? fb.phone,
    closingTime: sanity.closingTime ?? fb.closingTime,
    district:    sanity.district    ?? fb.district,
    coverImage:  sanity.coverImage,
  };
}

export default function KindergartenPage() {
  const [sanityInstitutions, setSanityInstitutions] = useState<KindergartenInstitution[]>([]);
  const [announcements, setAnnouncements] = useState<KindergartenAnnouncement[]>([]);
  const [filter, setFilter] = useState<string | null>(null); // null = all

  useEffect(() => {
    fetchAllInstitutions().then(setSanityInstitutions).catch(() => {});
    fetchAllAnnouncements().then(setAnnouncements).catch(() => {});
  }, []);

  const institutions = useMemo(
    () => INSTITUTION_FALLBACK.map((fb) =>
      mergeWithSanity(fb, sanityInstitutions.find((s) => s.slug === fb.slug))
    ),
    [sanityInstitutions],
  );

  const filteredAnnouncements = useMemo(() => {
    if (!filter) return announcements;
    return announcements.filter(
      (a) => a.isGlobal || a.institutionSlug === filter,
    );
  }, [announcements, filter]);

  return (
    <div className="space-y-6 px-3 py-4 sm:px-4 sm:py-6 lg:px-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl bg-zinc-100">
          🌸
        </div>
        <div>
          <h1 className="text-sm font-bold text-zinc-900">Наша Иднина — Градинки</h1>
          <p className="text-xs text-zinc-500">4 установи во Прилеп</p>
        </div>
      </div>

      {/* 2-column institution grid — direct links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {institutions.map((inst) => (
          <Link
            key={inst.slug}
            href={`/kindergarten/${inst.slug}`}
            className="group flex flex-col rounded-2xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-sm overflow-hidden">

            {inst.coverImage ? (
              <div className="relative h-32 w-full overflow-hidden">
                <Image
                  src={urlForImage(inst.coverImage).width(400).height(200).fit("crop").url()}
                  alt={inst.shortName} fill
                  className="object-cover transition-transform group-hover:scale-[1.02]"
                />
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center bg-zinc-50 border-b border-zinc-100">
                <span className="text-4xl opacity-50">🌸</span>
              </div>
            )}

            <div className="p-4 space-y-1.5">
              <p className="font-semibold text-zinc-900 group-hover:text-zinc-700 transition-colors">
                {inst.shortName}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {inst.phone && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Phone size={11} className="text-zinc-400" />{inst.phone}
                  </span>
                )}
                {inst.closingTime && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock size={11} className="text-zinc-400" />до {inst.closingTime}
                  </span>
                )}
                {inst.district && (
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <MapPin size={11} />{inst.district}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Announcements feed */}
      {announcements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Соопштенија</p>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
              {filteredAnnouncements.length}
            </span>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilter(null)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filter === null ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}>
              Сите
            </button>
            {INSTITUTION_FALLBACK.map((inst) => (
              <button
                key={inst.slug}
                onClick={() => setFilter(inst.slug)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === inst.slug ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}>
                {inst.shortName}
              </button>
            ))}
          </div>

          {/* Feed */}
          <div className="space-y-3">
            {filteredAnnouncements.map((a) => (
              <AnnouncementCard key={a._id} announcement={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Announcement card ─────────────────────────────────────────────────────────

function AnnouncementCard({ announcement: a }: { announcement: KindergartenAnnouncement }) {
  const shortName = (name: string | null) =>
    name?.replace(/Градинка\s*(Наша Иднина|"Наша Иднина")\s*[-–—]?\s*/i, "").trim() ?? name;

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      {/* Cover image */}
      {a.coverImage && !a.videoFileUrl && !a.videoUrl && (
        <div className="relative h-44 w-full">
          <Image
            src={urlForImage(a.coverImage).width(600).height(280).url()}
            alt={a.title} fill className="object-cover"
          />
        </div>
      )}
      {/* Uploaded video */}
      {a.videoFileUrl && (
        <video src={a.videoFileUrl} controls className="w-full max-h-72 bg-black" preload="metadata" />
      )}
      {/* YouTube / Vimeo */}
      {!a.videoFileUrl && a.videoUrl && (() => {
        const yt = a.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
        const vm = a.videoUrl.match(/vimeo\.com\/(\d+)/);
        if (yt) return (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe src={`https://www.youtube.com/embed/${yt[1]}`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen />
          </div>
        );
        if (vm) return (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe src={`https://player.vimeo.com/video/${vm[1]}`}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>
        );
        return null;
      })()}

      <div className="p-4 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-900 leading-snug">{a.title}</p>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 whitespace-nowrap">
            {a.isGlobal ? "Сите установи" : shortName(a.institutionName)}
          </span>
        </div>
        {a.body && <p className="text-xs leading-relaxed text-zinc-600 whitespace-pre-line">{a.body}</p>}
        <p className="text-[11px] text-zinc-400">{formatDays(a.publishedAt)}</p>
      </div>
    </article>
  );
}
