"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { detectPlatform, type MobilePlatform } from "../../lib/config/appStores";

const DISMISS_KEY = "install-banner-collapsed";
// Width of the green handle left peeking when the banner is collapsed (px).
const HANDLE_PX = 14;

/**
 * Mobile-only install prompt anchored to the LEFT edge. It slides in softly as
 * a full-width bar. The X doesn't remove it — it slides back to the edge,
 * leaving a wide green handle (the brand green) that slides it open again.
 */
export default function InstallAppBanner() {
  const [platform, setPlatform] = useState<MobilePlatform>("other");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Never show inside the native WebView.
    if (/mojprilep/i.test(navigator.userAgent)) return;

    setPlatform(detectPlatform(navigator.userAgent));
    setMounted(true);

    // If collapsed earlier this session, stay collapsed; otherwise slide open
    // on the next tick so the animation plays.
    const collapsed = sessionStorage.getItem(DISMISS_KEY) === "1";
    if (!collapsed) {
      const id = window.setTimeout(() => setOpen(true), 350);
      return () => window.clearTimeout(id);
    }
  }, []);

  if (!mounted) return null;

  const label =
    platform === "ios"
      ? "Преземи на App Store"
      : platform === "android"
        ? "Преземи на Google Play"
        : "Преземи ја апликацијата";

  function collapse() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  return (
    <div className="fixed inset-x-0 top-[80%] z-[60] -translate-y-1/2 lg:hidden">
      <div
        className="flex items-stretch transition-transform duration-500 ease-out will-change-transform"
        style={{
          transform: open ? "translateX(0)" : `translateX(calc(-100% + ${HANDLE_PX}px))`,
        }}>
        {/* Full-width card */}
        <div className="flex-1 border-y border-theme bg-theme-surface px-4 py-4 shadow-xl">
          <div className="flex items-center gap-3">
            <Image
              src="/logo/app-icon-192.png"
              alt="Мој Прилеп"
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-2xl"
            />
            <a
              href="/app"
              onClick={collapse}
              className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              {label}
            </a>
            <button
              type="button"
              onClick={collapse}
              aria-label="Затвори"
              className="-mr-1 shrink-0 rounded-full p-1 text-theme-muted hover:bg-theme-surface-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Green handle — the only part visible once collapsed. Hidden while
            open. Wide enough to be an easy tap target. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Отвори"
          style={{ width: open ? 0 : HANDLE_PX }}
          className={`shrink-0 cursor-pointer rounded-r-xl bg-primary shadow-md transition-opacity duration-300 ${
            open ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        />
      </div>
    </div>
  );
}
