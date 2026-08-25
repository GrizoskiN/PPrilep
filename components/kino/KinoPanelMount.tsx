"use client";

import { useEffect } from "react";

import { useRightPanel } from "../../lib/context/RightPanelContext";
import PastScreeningsPanel from "./PastScreeningsPanel";
import type { PastScreening } from "../../lib/sanity/moviePoll";

/**
 * Injects the archive into the shell's right panel. The data is fetched by the
 * server layout and passed through, so the panel appears on the first client
 * render rather than after a second round-trip.
 */
export default function KinoPanelMount({
  screenings,
  children,
}: {
  screenings: PastScreening[];
  children: React.ReactNode;
}) {
  const { setOverridePanel } = useRightPanel();

  useEffect(() => {
    setOverridePanel(<PastScreeningsPanel screenings={screenings} />, "/kino", true);
    return () => setOverridePanel(null, "/kino");
  }, [setOverridePanel, screenings]);

  return <>{children}</>;
}
