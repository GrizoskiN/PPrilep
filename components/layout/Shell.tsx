"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import Topbar from "./Topbar";
import LeftNav from "./LeftNav";
import RightPanel from "./RightPanel";
import BottomNav from "./BottomNav";
import MarqueeBanner from "../ui/MarqueeBanner";
import { useAuth } from "../../lib/hooks/useAuth";

interface Props {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export default function Shell({ children, rightPanel }: Props) {
  const { user, profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuOpenedAt, setMenuOpenedAt] = useState<number>(0);

  const closeMenu = () => setMenuOpen(false);

  const openMenu = () => {
    setMenuOpenedAt(Date.now());
    setMenuOpen(true);
  };

  const mobileUserLabel = user
    ? (profile?.full_name ?? profile?.username ?? "Профил")
    : "Гостин";

  const mainRef = useRef<HTMLElement>(null);

  // Forward keyboard scroll keys to the <main> when nothing else has focus.
  // Lets users on laptops without trackpad/wheel scroll the feed with arrow
  // keys, PageUp/PageDown, Space, Home, End — without showing a scrollbar.
  useEffect(() => {
    const SCROLL_KEYS = new Set([
      "ArrowDown",
      "ArrowUp",
      "PageDown",
      "PageUp",
      "Home",
      "End",
      " ",
      "Spacebar",
    ]);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(e.key)) return;
      // Skip when typing in inputs/textareas/contenteditable elements
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) return;
      }
      const main = mainRef.current;
      if (!main) return;

      const stepLine = 80;
      const stepPage = main.clientHeight - 60;

      switch (e.key) {
        case "ArrowDown":
          main.scrollBy({ top: stepLine, behavior: "smooth" });
          break;
        case "ArrowUp":
          main.scrollBy({ top: -stepLine, behavior: "smooth" });
          break;
        case "PageDown":
        case " ":
        case "Spacebar":
          main.scrollBy({ top: stepPage, behavior: "smooth" });
          break;
        case "PageUp":
          main.scrollBy({ top: -stepPage, behavior: "smooth" });
          break;
        case "Home":
          main.scrollTo({ top: 0, behavior: "smooth" });
          break;
        case "End":
          main.scrollTo({ top: main.scrollHeight, behavior: "smooth" });
          break;
        default:
          return;
      }
      e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <MarqueeBanner />
      <div className="flex h-screen w-full max-w-350 mx-auto flex-col overflow-hidden bg-transparent">
        <div className="flex h-full min-h-0   flex-1 flex-col overflow-hidden">
          <div className="grid shrink-0 grid-cols-1 lg:grid-cols-[18%_1fr_18%]">
            <div className="hidden lg:block border-r border-[#e4ece8] " />
            <Topbar onOpenMobileMenu={openMenu} />
            <div className="hidden lg:block border-l border-[#e4ece8] " />
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)_250px] xl:grid-cols-[280px_minmax(0,1fr)_280px]">
            <div className="scrollbar-hidden hidden min-h-0 overflow-y-auto lg:block lg:border-r lg:border-[#e4ece8]">
              <Suspense fallback={<div className="h-full" />}>
                <LeftNav />
              </Suspense>
            </div>
            <main
              ref={mainRef}
              tabIndex={-1}
              className="scrollbar-hidden min-h-0 overflow-y-auto pb-16 outline-none lg:pb-0">
              <div className="mx-auto w-full max-w-166.75">
                {children}
              </div>
            </main>
            <div className="scrollbar-hidden hidden min-h-0 overflow-y-auto lg:block lg:border-l lg:border-[#e4ece8]">
              {rightPanel ?? <RightPanel />}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />

      {menuOpen && (
        <button
          aria-label="Затвори мени"
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => {
            if (Date.now() - menuOpenedAt > 700) closeMenu();
          }}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[88vw] max-w-90 border-r border-[#e4ece8] bg-white shadow-xl transition-transform duration-200 ease-out lg:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex h-12 items-center justify-between border-b border-[#e4ece8] px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Мени
          </p>
          <button
            onClick={closeMenu}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Затвори мени">
            <X size={16} />
          </button>
        </div>

        <div className="h-[calc(100%-3rem)] overflow-y-auto">
          <section className="border-b border-[#e4ece8] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Корисник
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-700">
              {mobileUserLabel}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {user ? (
                <Link
                  href="/account"
                  onClick={closeMenu}
                  className="rounded-lg border border-[#dce6e2] px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                  Мој профил
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={closeMenu}
                  className="rounded-lg border border-[#dce6e2] px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                  Најава
                </Link>
              )}
            </div>
          </section>

          <section className="border-b border-[#e4ece8]">
            <div className="px-4 pb-2 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Навигација
              </p>
            </div>
            <Suspense fallback={<div className="h-40" />}>
              <LeftNav />
            </Suspense>
          </section>

          <section>
            <div className="px-4 pb-2 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Инфо панел
              </p>
            </div>
            <div className="pb-6">{rightPanel ?? <RightPanel />}</div>
          </section>
        </div>
      </aside>
    </>
  );
}
