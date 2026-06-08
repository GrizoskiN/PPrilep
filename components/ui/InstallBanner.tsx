"use client";

import { useEffect, useState } from "react";
import { Share, Plus, X, Download } from "lucide-react";

const INSTALLED_KEY = "pp_pwa_installed"; // set permanently once installed
const SNOOZE_KEY = "pp_pwa_snooze_until"; // timestamp: don't show until then
const SNOOZE_DAYS = 4;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  function markInstalled() {
    try {
      localStorage.setItem(INSTALLED_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    // Already installed (opened as a PWA / added to home screen) → never remind.
    if (isStandalone()) {
      markInstalled();
      return;
    }
    try {
      if (localStorage.getItem(INSTALLED_KEY)) return;
      const snooze = localStorage.getItem(SNOOZE_KEY);
      if (snooze && Date.now() < Number(snooze)) return; // still snoozed
    } catch {
      /* ignore */
    }

    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    setIsIos(ios);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Fired by the browser once the app is actually installed → stop reminding.
    const onInstalled = () => {
      markInstalled();
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires beforeinstallprompt — show it after a short delay so it
    // doesn't compete with first paint.
    let t: ReturnType<typeof setTimeout> | undefined;
    if (ios) t = setTimeout(() => setVisible(true), 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (t) clearTimeout(t);
    };
  }, []);

  // "Не сега" / ✕ — snooze a few days, then remind again (we don't know if they
  // installed, so we ask again later rather than permanently giving up).
  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 864e5));
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (isIos) {
      setShowIosHelp((s) => !s);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
    if (outcome === "accepted") markInstalled();
    else dismiss(); // declined the native prompt → snooze, don't nag
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] p-3 lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[#cbe9e4] bg-white shadow-[0_8px_30px_rgba(15,23,43,0.18)]">
        <div className="flex items-center gap-3 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/app-icon.svg"
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl object-contain"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-theme-heading">Чекор поблиску до нас 💚</p>
            <p className="text-xs leading-snug text-theme-muted">
              Додај го Мој Прилеп на почетниот екран за брз пристап.
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Затвори"
            className="shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
            <X size={18} />
          </button>
        </div>

        {showIosHelp ? (
          <div className="border-t border-zinc-100 bg-[#f8fbfa] px-4 py-3 text-xs leading-relaxed text-theme-muted">
            <span className="inline-flex flex-wrap items-center gap-1">
              Притисни
              <Share size={14} className="text-primary" />
              <strong>Сподели</strong> долу, па
              <Plus size={14} className="text-primary" />
              <strong>„На почетен екран“</strong>.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-t border-zinc-100 px-3 py-2.5">
            <button
              onClick={dismiss}
              className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-theme-muted hover:bg-zinc-100">
              Не сега
            </button>
            <button
              onClick={install}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary/90">
              {isIos ? <Share size={15} /> : <Download size={15} />}
              {isIos ? "Како?" : "Додај"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
