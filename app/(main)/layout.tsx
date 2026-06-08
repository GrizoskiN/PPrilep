"use client";

import { usePathname } from "next/navigation";
import Shell from "../../components/layout/Shell";
import OnboardingTour from "../../components/onboarding/OnboardingTour";
import InstallBanner from "../../components/ui/InstallBanner";
import { AuthProvider } from "../../lib/context/AuthContext";
import { RightPanelProvider, useRightPanel } from "../../lib/context/RightPanelContext";

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { entry } = useRightPanel();
  const pathname = usePathname() ?? "/";

  // An injected panel only applies on the route that registered it (so a stale
  // panel from a previous route never bleeds onto the current one). When it
  // doesn't match, pass undefined → Shell shows skeleton (custom route) or the
  // default panel.
  const effectivePanel = entry
    ? entry.exact
      ? pathname === entry.route ? entry.panel : null
      : pathname.startsWith(entry.route) ? entry.panel : null
    : null;

  return (
    <>
      <Shell rightPanel={effectivePanel ?? undefined}>{children}</Shell>
      <OnboardingTour />
      <InstallBanner />
    </>
  );
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
