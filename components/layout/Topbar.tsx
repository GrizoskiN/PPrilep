"use client";

import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import Button from "../ui/Button";
import UserMenu from "../auth/UserMenu";
import NotificationBell from "../auth/NotificationBell";
import { useAuth } from "../../lib/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const ReportModal = dynamic(() => import("../issues/ReportModal"), {
  ssr: false,
});

const ROTATING_WORDS = ["Подобар", "Почист", "Поубав", "Побезбеден"];

interface Props {
  onOpenMobileMenu?: () => void;
}

export default function Topbar({ onOpenMobileMenu }: Props) {
  const { user, profile, signOut } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [typedWord, setTypedWord] = useState(ROTATING_WORDS[0]);
  const [isDeleting, setIsDeleting] = useState(false);
  const lastMenuOpenRef = useRef(0);
  const pathname = usePathname();
  const [activeCount, setActiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // Seed from cache immediately (runs after hydration — no SSR mismatch)
    const cachedActive = parseInt(localStorage.getItem("issues_active_count") ?? "0", 10);
    const cachedTotal  = parseInt(localStorage.getItem("issues_total_count")  ?? "0", 10);
    if (cachedActive) setActiveCount(cachedActive);
    if (cachedTotal)  setTotalCount(cachedTotal);

    let mounted = true;
    const supabase = createClient();
    async function loadCounts() {
      const [{ count: active }, { count: total }] = await Promise.all([
        supabase
          .from("issues")
          .select("id", { count: "exact", head: true })
          .neq("status", "resolved"),
        supabase.from("issues").select("id", { count: "exact", head: true }),
      ]);
      if (mounted) {
        const a = active ?? 0;
        const t = total ?? 0;
        setActiveCount(a);
        setTotalCount(t);
        localStorage.setItem("issues_active_count", String(a));
        localStorage.setItem("issues_total_count", String(t));
      }
    }
    loadCounts();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const currentWord = ROTATING_WORDS[wordIndex];
    const typingSpeed = isDeleting ? 60 : 110;
    const pauseOnFullWord = 1300;

    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && typedWord === currentWord) {
      timeout = setTimeout(() => setIsDeleting(true), pauseOnFullWord);
    } else if (isDeleting && typedWord.length === 0) {
      timeout = setTimeout(() => {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
      }, 220);
    } else {
      timeout = setTimeout(() => {
        setTypedWord((prev) =>
          isDeleting
            ? prev.slice(0, -1)
            : currentWord.slice(0, prev.length + 1),
        );
      }, typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [isDeleting, typedWord, wordIndex]);

  const sectionLabel = (() => {
    if (pathname === "/") return "Почетна";
    if (pathname.startsWith("/account")) return "Мој профил";
    if (pathname.startsWith("/issues")) return "Пријави";
    if (pathname.startsWith("/ideas")) return "Идеи";
    if (pathname.startsWith("/fund")) return "Фонд";
    if (pathname.startsWith("/heroes")) return "Херои";
    if (pathname.startsWith("/communities")) return "Заедници";
    if (pathname.startsWith("/utility")) return "Комунални";
    if (pathname.startsWith("/auth/login")) return "Најава";
    if (pathname.startsWith("/auth/register")) return "Регистрација";
    if (pathname.startsWith("/auth")) return "Профил";
    return "Почетна";
  })();

  function openMobileMenu() {
    const now = Date.now();
    if (now - lastMenuOpenRef.current < 400) return;
    lastMenuOpenRef.current = now;
    onOpenMobileMenu?.();
  }

  function handleReportClick() {
    if (!user) {
      const next = `${pathname ?? "/"}`;
      // Prevent redirect on localhost during development
      if (
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1")
      ) {
        return;
      }
      window.location.assign(`/auth/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setReportOpen(true);
  }

  return (
    <>
      <header className="col-span-3 z-30 flex h-18 items-center justify-between border-b border-[#e4ece8] px-2 ">
        <Link
          href="/"
          className="flex max-w-[60%] items-center gap-3 cursor-pointer">
          <span className="hidden h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#4fd4c1,#2aa99d)] text-sm font-black text-white shadow-[0_10px_20px_rgba(42,169,157,0.22)] md:flex">
            ПП
          </span>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex min-w-0 items-baseline gap-1 text-xl leading-none tracking-tight">
              <span className="inline-block min-w-0 truncate font-semibold text-slate-900">
                {typedWord}
                <span className="ml-0.5 inline-block h-[0.9em] w-px animate-pulse bg-slate-400 align-[-0.12em]" />
              </span>
              <span className="font-semibold text-primary">Прилеп</span>
            </div>
            <span className="hidden text-sm text-slate-500 lg:inline">|</span>
            <span className="hidden text-sm text-slate-500 lg:inline">
              {sectionLabel}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={handleReportClick}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-colors hover:bg-primary/90"
              aria-label="Пријави проблем">
              <Plus size={16} />
            </button>
            <button
              onTouchEnd={(e) => {
                e.preventDefault();
                openMobileMenu();
              }}
              onClick={openMobileMenu}
              className="relative  flex h-10 w-10 items-center justify-center text-slate-800 z-50"
              aria-label="Отвори мени">
              <Menu size={22} strokeWidth={2.4} />
            </button>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="hidden items-center gap-2 text-sm text-slate-500 lg:flex">
              <span className="text-[#f2a93b]">⚡</span>
              <span className="font-semibold text-slate-700">
                {activeCount}/{totalCount} активни
              </span>
            </div>

            {user ? (
              <>
                <Button size="sm" variant="teal" onClick={handleReportClick}>
                  <Plus size={13} /> Пријави проблем
                </Button>
                <NotificationBell userId={user.id} />
                <UserMenu profile={profile} onSignOut={signOut} />
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Најава
                  </Button>
                </Link>
                <Button size="sm" variant="primary" onClick={handleReportClick}>
                  <Plus size={13} /> Пријави проблем
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {reportOpen && (
        <ReportModal
          userId={user?.id}
          onClose={() => setReportOpen(false)}
          onSuccess={() => setReportOpen(false)}
        />
      )}
    </>
  );
}
