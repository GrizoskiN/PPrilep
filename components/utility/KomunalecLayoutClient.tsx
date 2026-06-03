"use client";

import { useEffect } from "react";
import { useRightPanel } from "../../lib/context/RightPanelContext";
import KomunalecRightPanel from "./KomunalecRightPanel";

interface Props {
  children: React.ReactNode;
}

export default function KomunalecLayoutClient({ children }: Props) {
  const { setOverridePanel } = useRightPanel();

  useEffect(() => {
    setOverridePanel(<KomunalecRightPanel />, "/utility/garbage", false);
    return () => setOverridePanel(null, "/utility/garbage");
  }, [setOverridePanel]);

  return <>{children}</>;
}
