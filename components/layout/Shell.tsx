"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import Topbar from "./Topbar";
import LeftNav from "./LeftNav";
import RightPanel from "./RightPanel";
import RightPanelSkeleton from "./RightPanelSkeleton";
import NavigationProgress from "./NavigationProgress";
import MarqueeBanner from "../ui/MarqueeBanner";
import { usesThreeColumns, routeHasCustomPanel } from "../../lib/layout";

interface Props {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Shell({ children, rightPanel, fullWidth }: Props) {
  const pathname = usePathname();

  // 3-column routes keep the right info panel; everything else collapses the
  // middle + right into one wide column (see lib/layout.ts).
  const threeColumn = usesThreeColumns(pathname ?? "/");
  // In the 2-column layout the main content spans the full combined width.
  const contentFull = fullWidth || !threeColumn;
  // The issues feed goes edge-to-edge (no side gutter) on mobile + tablet.
  const flush = (pathname ?? "/").startsWith("/issues");

  // The panel to render in each slot: an explicitly-injected panel wins;
  // otherwise routes that inject their own panel show a neutral skeleton (until
  // their client effect mounts it) and all other routes show the default panel.
  // Default right panel = promise tracker + sponsors (RightPanel). Custom-panel
  // routes show a skeleton until their injected panel mounts.
  const panelContent =
    rightPanel ??
    (routeHasCustomPanel(pathname ?? "/") ? (
      <RightPanelSkeleton />
    ) : (
      <RightPanel />
    ));
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuOpenedAt, setMenuOpenedAt] = useState<number>(0);

  const closeMenu = () => setMenuOpen(false);

  // The onboarding tour opens the drawer on menu steps and closes it otherwise.
  useEffect(() => {
    const close = () => setMenuOpen(false);
    const open = () => {
      setMenuOpenedAt(Date.now());
      setMenuOpen(true);
    };
    window.addEventListener("pp:close-mobile-menu", close);
    window.addEventListener("pp:open-mobile-menu", open);
    return () => {
      window.removeEventListener("pp:close-mobile-menu", close);
      window.removeEventListener("pp:open-mobile-menu", open);
    };
  }, []);

  function handleMobileNavClick(e: React.MouseEvent<HTMLElement>) {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest("a[href]")) {
      closeMenu();
    }
  }

  const openMenu = () => {
    setMenuOpenedAt(Date.now());
    setMenuOpen(true);
  };

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
        )
          return;
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
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <div className="flex h-screen w-full  flex-col overflow-hidden bg-transparent">
        <MarqueeBanner />
        <div className="mx-auto flex h-full min-h-0 w-full max-w-400 flex-1 flex-col overflow-hidden">
          <div className="grid shrink-0 grid-cols-1 lg:grid-cols-[18%_1fr_18%]">
            <div className="hidden lg:block" />
            <Topbar onOpenMobileMenu={openMenu} />
            <div className="hidden lg:block" />
          </div>

          <div
            className={`grid min-h-0 flex-1  grid-cols-1 ${
              threeColumn
                ? "lg:grid-cols-[235px_minmax(0,1fr)_235px] xl:grid-cols-[280px_minmax(0,1fr)_280px]"
                : "lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]"
            }`}>
            <div className="scrollbar-hidden hidden min-h-0 overflow-y-auto lg:block">
              <Suspense fallback={<div className="h-full" />}>
                <LeftNav />
              </Suspense>
            </div>
            <main
              ref={mainRef}
              tabIndex={-1}
              className="scrollbar-hidden min-h-0 overflow-y-auto pb-16 outline-none lg:pb-0">
              <div
                className={`${contentFull ? "app-content-wide" : "app-content"}${
                  flush ? " app-content--flush" : ""
                }`}>
                {children}
                {/* Mobile: right panel inline below content (hidden on desktop where it's the 3rd column). Suppressed on the issues feed to keep it clean. */}
                {threeColumn && !flush && (
                  <div className="mt-2 border-t border-zinc-100 lg:hidden">
                    {panelContent}
                  </div>
                )}
              </div>
            </main>
            {threeColumn && (
              <div className="scrollbar-hidden hidden min-h-0 overflow-y-auto lg:block">
                {panelContent}
              </div>
            )}
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
        className={`fixed inset-y-0 left-0 z-50 w-[80vw] max-w-72 border-r border-[#e4ece8] bg-white shadow-xl transition-transform duration-200 ease-out lg:hidden ${
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
          <section
            className="border-b border-[#e4ece8] [&_a.group]:text-[15px] [&_a.group]:py-2.5"
            onClickCapture={handleMobileNavClick}>
            <Suspense fallback={<div className="h-40" />}>
              <LeftNav />
            </Suspense>
          </section>

          {threeColumn && (
            <section>
              <div className="px-3 pb-2 pt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Инфо панел
                </p>
              </div>
              <div className="px-3 pb-6">{panelContent}</div>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
