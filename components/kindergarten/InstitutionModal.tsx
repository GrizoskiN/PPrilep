"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Phone, Clock, MapPin, User, ExternalLink } from "lucide-react";

export interface InstitutionInfo {
  slug: string;
  name: string;
  shortName: string;
  address: string | null;
  phone: string | null;
  closingTime: string | null;
  district: string | null;
  description: string | null;
  director: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface Props {
  institution: InstitutionInfo;
  onClose: () => void;
}

export default function InstitutionModal({ institution, onClose }: Props) {
  // Lock body scroll + close on Escape
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const modal = (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-zinc-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ background: "linear-gradient(135deg, #fce7f3, #fbcfe8)" }}>
              🌸
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900">{institution.shortName}</p>
              <p className="text-xs text-zinc-400">Градинка „Наша Иднина&quot;</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 px-5 py-5">

          {/* Key info grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {institution.phone && (
              <a
                href={`tel:${institution.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 hover:bg-rose-50 hover:border-rose-200 transition-colors group">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
                  <Phone size={15} />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Телефон</p>
                  <p className="text-sm font-semibold text-zinc-800 group-hover:text-rose-600">{institution.phone}</p>
                </div>
              </a>
            )}

            {institution.closingTime && (
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-500">
                  <Clock size={15} />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Работно Време</p>
                  <p className="text-sm font-semibold text-zinc-800">07:00 – {institution.closingTime}</p>
                </div>
              </div>
            )}

            {institution.address && (
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 sm:col-span-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-500">
                  <MapPin size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Адреса</p>
                  <p className="text-sm font-semibold text-zinc-800">{institution.address}</p>
                </div>
              </div>
            )}

            {institution.director && (
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 sm:col-span-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-500">
                  <User size={15} />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Раководител</p>
                  <p className="text-sm font-semibold text-zinc-800">{institution.director}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {institution.description && (
            <p className="text-sm leading-relaxed text-zinc-600 whitespace-pre-line">
              {institution.description}
            </p>
          )}

          {/* Map + detail page links */}
          <div className="flex gap-2 pt-1">
            {institution.lat && institution.lng && (
              <a
                href={`https://www.google.com/maps?q=${institution.lat},${institution.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
                <MapPin size={13} className="text-rose-400" />
                Google Maps
              </a>
            )}
            <a
              href={`/kindergarten/${institution.slug}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "#fb7185" }}>
              <ExternalLink size={13} />
              Детали
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}
