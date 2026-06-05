"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Global top progress bar that gives immediate feedback when a navigation
 * starts. Next's App Router blocks the screen while the server component for
 * the next route streams in — on slow / mobile networks that means 1–2s where
 * nothing visibly happens after a tap. This component listens for clicks on any
 * internal <a> (LeftNav, BottomNav, district chips, in-content links…) and
 * animates a thin bar at the very top of the viewport until the new route
 * commits (detected via pathname / searchParams change).
 *
 * It deliberately waits a short beat (SHOW_DELAY) before showing, so instant
 * (prefetched) navigations don't flash the bar.
 */

const SHOW_DELAY = 100; // ms — don't show the bar for near-instant navigations
const DONE_HOLD = 220; // ms — keep the full bar visible briefly before fading

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  const startedRef = useRef(false); // a navigation is in flight
  const shownRef = useRef(false); // the bar actually became visible
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trickleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (trickleTimer.current) clearInterval(trickleTimer.current);
    if (doneTimer.current) clearTimeout(doneTimer.current);
    showTimer.current = null;
    trickleTimer.current = null;
    doneTimer.current = null;
  }

  function begin() {
    if (startedRef.current) return; // already running
    startedRef.current = true;
    shownRef.current = false;
    if (doneTimer.current) {
      clearTimeout(doneTimer.current);
      doneTimer.current = null;
    }

    showTimer.current = setTimeout(() => {
      shownRef.current = true;
      setActive(true);
      setProgress(8);
      trickleTimer.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p;
          const inc = p < 45 ? 9 : p < 70 ? 4 : 1.5;
          return Math.min(90, p + inc);
        });
      }, 280);
    }, SHOW_DELAY);
  }

  function complete() {
    if (!startedRef.current) return;
    startedRef.current = false;
    if (showTimer.current) clearTimeout(showTimer.current);
    if (trickleTimer.current) clearInterval(trickleTimer.current);
    showTimer.current = null;
    trickleTimer.current = null;

    // Navigation finished before the bar ever showed → it was instant, no flash.
    if (!shownRef.current) {
      setActive(false);
      setProgress(0);
      return;
    }

    setProgress(100);
    doneTimer.current = setTimeout(() => {
      setActive(false);
      setProgress(0);
      shownRef.current = false;
    }, DONE_HOLD);
  }

  // Start the bar on any internal link click or back/forward navigation.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;

      const el = e.target as HTMLElement | null;
      const a = el?.closest?.("a");
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href) return;
      if (a.hasAttribute("download")) return;
      const targetAttr = a.getAttribute("target");
      if (targetAttr && targetAttr !== "_self") return;

      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const current = window.location.pathname + window.location.search;
      const next = url.pathname + url.search;
      // Same destination (or pure in-page hash) → no navigation happens.
      if (next === current) return;
      if (url.pathname === window.location.pathname && url.hash && !url.search)
        return;

      begin();
    }

    function onPopState() {
      begin();
    }

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
  }, []);

  // The route committed — finish the bar.
  useEffect(() => {
    complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      className="nav-progress"
      style={{
        width: `${progress}%`,
        opacity: active ? 1 : 0,
      }}
    />
  );
}
