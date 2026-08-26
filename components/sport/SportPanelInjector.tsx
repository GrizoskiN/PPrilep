"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { useRightPanel } from "../../lib/context/RightPanelContext";
import SportRightPanel from "./SportRightPanel";
import type { DaySlot, SportNewsItem } from "../../lib/sanity/sport";

interface Props {
  day: number;
  slots: DaySlot[];
  news: SportNewsItem[];
}

/**
 * Injects the sport panel for every /sport route — the directory, a club
 * profile and the submission form all get the same city-wide schedule and news.
 * A club's own announcements live in the main column of its profile, so the
 * panel stays one shared thing instead of re-fetching per slug.
 */
export default function SportPanelInjector({ day, slots, news }: Props) {
  const { setOverridePanel } = useRightPanel();
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!pathname?.startsWith("/sport")) return;
    setOverridePanel(<SportRightPanel day={day} slots={slots} news={news} />, "/sport");
    return () => setOverridePanel(null, "/sport");
  }, [pathname, day, slots, news, setOverridePanel]);

  return null;
}
