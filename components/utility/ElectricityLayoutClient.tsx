"use client";

import { useEffect } from "react";
import { useRightPanel } from "../../lib/context/RightPanelContext";
import ElectricityRightPanel from "./ElectricityRightPanel";

interface Props {
  children: React.ReactNode;
}

export default function ElectricityLayoutClient({ children }: Props) {
  const { setOverridePanel } = useRightPanel();

  useEffect(() => {
    setOverridePanel(<ElectricityRightPanel />, "/utility/electricity", false);
    return () => setOverridePanel(null, "/utility/electricity");
  }, [setOverridePanel]);

  return <>{children}</>;
}
