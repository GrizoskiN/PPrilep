"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { useRightPanel } from "../../lib/context/RightPanelContext";
import KindergartenListRightPanel from "./KindergartenListRightPanel";
import type { SignupDocument, MenuPost } from "../../lib/sanity/kindergarten";

interface Props {
  signupDocuments: SignupDocument[];
  latestMenu: MenuPost | null;
}

// Receives pre-fetched data from the server layout and injects the panel into
// context via useLayoutEffect — fires before the browser paints, so there is
// no visible flash of the default panel.
export default function KindergartenListPanelInjector({ signupDocuments, latestMenu }: Props) {
  const { setOverridePanel } = useRightPanel();
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname !== "/kindergarten") return;
    setOverridePanel(
      <KindergartenListRightPanel signupDocuments={signupDocuments} latestMenu={latestMenu} />,
      "/kindergarten",
      true,
    );
    return () => setOverridePanel(null, "/kindergarten");
  }, [pathname, signupDocuments, latestMenu, setOverridePanel]);

  return null;
}
