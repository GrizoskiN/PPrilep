"use client";

import { useLayoutEffect } from "react";
import { useRightPanel } from "../../../lib/context/RightPanelContext";
import AccountRightPanel from "../../../components/account/AccountRightPanel";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setOverridePanel } = useRightPanel();

  useLayoutEffect(() => {
    setOverridePanel(<AccountRightPanel />, "/account");
    return () => setOverridePanel(null);
  }, [setOverridePanel]);

  return <>{children}</>;
}
