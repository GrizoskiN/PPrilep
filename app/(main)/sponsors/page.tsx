"use client";

import { useState, useEffect } from "react";
import {
  Heart, Lightbulb, Trophy, Building2, Users, HandHeart, Star,
} from "lucide-react";
import { createClient } from "../../../lib/supabase/client";
import PartnerModal from "../../../components/sponsors/PartnerModal";
import MembershipAdminPanel from "../../../components/sponsors/MembershipAdminPanel";

// ── Placeholder data — replace with Sanity/Supabase later ───────────────────

const MEMBERS = [
  { name: "Александар М.", since: "2026", note: "Активист, волонтер" },
  { name: "Марија К.",      since: "2026", note: "Архитект, идеи за јавен простор" },
  { name: "Стефан Т.",      since: "2026", note: "ИТ поддршка" },
];

const COMPANIES = [
  {
    name: "Cava Bar",
    tag: "Угостителство",
    desc: "Бесплатно кафе за тројцата најактивни локални херои секој месец.",
    emoji: "☕",
  },
];

// ── How we use support ───────────────────────────────────────────────────────

const IMPACT_ITEMS = [
  {
    icon: <HandHeart size={20} />,
    title: "Волонтерство & Труд",
    desc: "Секој час поминат во подобрување на градот е придонес. Не треба пари — треба посветеност.",
  },
  {
    icon: <Lightbulb size={20} />,
    title: "Знаење & Вештини",
    desc: "Архитекти, програмери, правници, едукатори — вашата струка е вредна за заедницата.",
  },
  {
    icon: <Trophy size={20} />,
    title: "Видливост & Угледност",
    desc: "Партнерите добиваат место во апликацијата, признанија и благодарност од граѓаните.",
  },
  {
    icon: <Building2 size={20} />,
    title: "Финансиска Поддршка",
    desc: "Членарини и донации финансираат конкретни акции: садење дрва, фарбање игралишта, јавни настани.",
  },
];

// ── Initials avatar ───────────────────────────────────────────────────────────

function Initials({ name }: { name: string }) {
  const letters = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-600">
      {letters}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface UserInfo { id: string; name: string | null; email: string | null; isAdmin: boolean }

export default function SponsorsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      supabase
        .from("profiles")
        .select("full_name, is_admin")
        .eq("id", u.id)
        .single()
        .then(({ data }) => {
          setUser({
            id: u.id,
            name: data?.full_name ?? null,
            email: u.email ?? null,
            isAdmin: data?.is_admin ?? false,
          });
        });
    });
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-6 lg:px-6">

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — Инфо
      ════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl px-7 py-10 text-white sm:px-10 sm:py-12" style={{ background: "#2aa99d" }}>
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-black/10 blur-3xl" />

          <div className="relative space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/70">
              🤝 Партнери & Членови
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl">
              Заедно за подобар Прилеп
            </h1>
            <p className="text-base leading-relaxed text-white/75 max-w-xl">
              Мој Прилеп е граѓанска платформа — без политика, без пари на тезга.
              Напредуваме само ако луѓето и бизнисите во градот веруваат во идејата
              и вложуваат: со своето <strong className="text-white">време</strong>,{" "}
              <strong className="text-white">знаење</strong> или{" "}
              <strong className="text-white">ресурси</strong>.
              Секој придонес — мал или голем — директно се враќа назад во заедницата.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-100"
              style={{ color: "#2aa99d" }}>
              <Heart size={16} />
              Станете партнер
            </button>
          </div>
        </div>

        {/* Impact grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {IMPACT_ITEMS.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                {item.icon}
              </span>
              <div>
                <p className="font-semibold text-zinc-900">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — Членови
      ════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-zinc-500" />
            <h2 className="text-base font-bold text-zinc-900">Членови</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">
              {MEMBERS.length}
            </span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80"
            style={{ borderColor: "#2aa99d", color: "#2aa99d" }}>
            + Станете член
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MEMBERS.map((m) => (
            <div
              key={m.name}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
              <Initials name={m.name} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-900">{m.name}</p>
                <p className="truncate text-xs text-zinc-400">{m.note}</p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                {m.since}
              </span>
            </div>
          ))}

          {/* Open slot */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm transition-colors hover:opacity-80"
            style={{ borderColor: "#2aa99d", color: "#2aa99d", background: "#d8f4ef55" }}>
            <Star size={14} />
            Станете следниот член
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3 — Компании партнери
      ════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-zinc-500" />
            <h2 className="text-base font-bold text-zinc-900">Компании партнери</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">
              {COMPANIES.length}
            </span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80"
            style={{ borderColor: "#2aa99d", color: "#2aa99d" }}>
            + Постанете партнер
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {COMPANIES.map((c) => (
            <div
              key={c.name}
              className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
              {/* Logo placeholder */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-3xl">
                {c.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-zinc-900">{c.name}</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {c.tag}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">{c.desc}</p>
              </div>
            </div>
          ))}

          {/* Open slot */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex min-h-[88px] items-center justify-center gap-2 rounded-2xl border border-dashed p-5 text-sm transition-colors hover:opacity-80"
            style={{ borderColor: "#2aa99d", color: "#2aa99d", background: "#d8f4ef55" }}>
            <Building2 size={16} />
            Слободно место за нов партнер
          </button>
        </div>
      </section>

      {/* ── Admin panel ── */}
      {user?.isAdmin && <MembershipAdminPanel />}

      {/* ── Modal ── */}
      {modalOpen && (
        <PartnerModal
          onClose={() => setModalOpen(false)}
          userId={user?.id}
          prefillName={user?.name}
          prefillEmail={user?.email}
        />
      )}
    </div>
  );
}
