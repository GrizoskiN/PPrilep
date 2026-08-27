"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { useRightPanel } from "../../lib/context/RightPanelContext";
import BusRulesPanel from "./BusRulesPanel";

/**
 * Injects the station rules into the right panel on /bus-station. Headless —
 * the page renders this once; the panel content is static, so there is nothing
 * to pass through.
 */
export default function BusPanelInjector() {
  const { setOverridePanel } = useRightPanel();
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname !== "/bus-station") return;
    setOverridePanel(<BusRulesPanel />, "/bus-station", true);
    return () => setOverridePanel(null, "/bus-station");
  }, [pathname, setOverridePanel]);

  return null;
}
