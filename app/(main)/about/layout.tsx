"use client";

import { useEffect } from "react";
import { useRightPanel } from "../../../lib/context/RightPanelContext";
import AboutRightPanel from "../../../components/about/AboutRightPanel";

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  const { setOverridePanel } = useRightPanel();

  useEffect(() => {
    setOverridePanel(<AboutRightPanel />, "/about", true);
    return () => setOverridePanel(null);
  }, [setOverridePanel]);

  return <>{children}</>;
}
