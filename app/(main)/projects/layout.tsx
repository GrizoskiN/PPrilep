"use client";

import { useEffect } from "react";
import { useRightPanel } from "../../../lib/context/RightPanelContext";
import AboutRightPanel from "../../../components/about/AboutRightPanel";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const { setOverridePanel } = useRightPanel();

  useEffect(() => {
    setOverridePanel(<AboutRightPanel />, "/projects", true);
    return () => setOverridePanel(null, "/projects");
  }, [setOverridePanel]);

  return <>{children}</>;
}
