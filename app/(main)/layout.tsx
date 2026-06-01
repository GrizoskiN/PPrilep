"use client";

import Shell from "../../components/layout/Shell";
import { RightPanelProvider, useRightPanel } from "../../lib/context/RightPanelContext";

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { overridePanel } = useRightPanel();
  return <Shell rightPanel={overridePanel ?? undefined}>{children}</Shell>;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <RightPanelProvider>
      <MainLayoutInner>{children}</MainLayoutInner>
    </RightPanelProvider>
  );
}
