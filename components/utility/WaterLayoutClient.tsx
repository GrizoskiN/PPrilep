"use client";

import { useEffect } from "react";
import { useRightPanel } from "../../lib/context/RightPanelContext";
import WaterRightPanel from "./WaterRightPanel";

interface Props {
  children: React.ReactNode;
}

export default function WaterLayoutClient({ children }: Props) {
  const { setOverridePanel } = useRightPanel();

  useEffect(() => {
    setOverridePanel(<WaterRightPanel />, "/utility/water", false);
    return () => setOverridePanel(null, "/utility/water");
  }, [setOverridePanel]);

  return <>{children}</>;
}
