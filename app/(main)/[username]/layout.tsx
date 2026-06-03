"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRightPanel } from "../../../lib/context/RightPanelContext";
import PublicSponsorPanel from "../../../components/ui/PublicSponsorPanel";

export default function UserProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setOverridePanel } = useRightPanel();
  const pathname = usePathname();

  useEffect(() => {
    // Root-level profile route is dynamic (/<username>), so key the override to
    // the exact current path.
    setOverridePanel(<PublicSponsorPanel />, pathname, true);
    return () => setOverridePanel(null);
  }, [setOverridePanel, pathname]);

  return <>{children}</>;
}
