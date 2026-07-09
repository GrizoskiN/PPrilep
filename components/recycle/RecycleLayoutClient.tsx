"use client";

import { useEffect } from "react";
import { useRightPanel } from "../../lib/context/RightPanelContext";
import RecycleRightPanel from "./RecycleRightPanel";

interface Props {
  children: React.ReactNode;
}

export default function RecycleLayoutClient({ children }: Props) {
  const { setOverridePanel } = useRightPanel();

  useEffect(() => {
    setOverridePanel(<RecycleRightPanel />, "/recycle", true);
    return () => setOverridePanel(null, "/recycle");
  }, [setOverridePanel]);

  return <>{children}</>;
}
