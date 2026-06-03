"use client";

import { usePathname } from "next/navigation";
import Shell from "../../components/layout/Shell";
import { AuthProvider } from "../../lib/context/AuthContext";
import { RightPanelProvider, useRightPanel } from "../../lib/context/RightPanelContext";

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { entry } = useRightPanel();
  const pathname = usePathname();

  const effectivePanel = entry
    ? entry.exact
      ? pathname === entry.route ? entry.panel : null
      : pathname.startsWith(entry.route) ? entry.panel : null
    : null;

  return <Shell rightPanel={effectivePanel ?? undefined}>{children}</Shell>;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RightPanelProvider>
        <MainLayoutInner>{children}</MainLayoutInner>
      </RightPanelProvider>
    </AuthProvider>
  );
}
