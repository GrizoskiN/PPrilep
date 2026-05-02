"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import Topbar from "./Topbar";
import LeftNav from "./LeftNav";
import RightPanel from "./RightPanel";
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
            <main className="scrollbar-hidden min-h-0 overflow-y-auto bg-white">
              {children}
            </main>
            <div className="scrollbar-hidden hidden min-h-0 overflow-y-auto lg:block lg:border-l lg:border-[#e4ece8]">
              {rightPanel ?? <RightPanel />}
            </div>
          </div>
        </div>
      </div>

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
