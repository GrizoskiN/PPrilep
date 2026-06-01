"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRightPanel } from "../../../lib/context/RightPanelContext";
import KindergartenListRightPanel from "../../../components/kindergarten/KindergartenListRightPanel";
import {
  fetchSignupDocuments,
  fetchLatestGlobalMenu,
  type SignupDocument,
  type MenuPost,
} from "../../../lib/sanity/kindergarten";

export default function KindergartenLayout({ children }: { children: React.ReactNode }) {
  const { setOverridePanel } = useRightPanel();
  const pathname = usePathname();
  const [signupDocs, setSignupDocs] = useState<SignupDocument[]>([]);
  const [latestMenu, setLatestMenu] = useState<MenuPost | null>(null);

  useEffect(() => {
    Promise.all([
      fetchSignupDocuments(null).catch(() => [] as SignupDocument[]),
      fetchLatestGlobalMenu().catch(() => null),
    ]).then(([docs, menu]) => {
      setSignupDocs(docs);
      setLatestMenu(menu);
    });

    return () => setOverridePanel(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Only inject the list panel on the exact /kindergarten route —
  // child [slug] layouts manage their own panel on detail pages
  useEffect(() => {
    if (pathname !== "/kindergarten") return;
    setOverridePanel(
      <KindergartenListRightPanel
        signupDocuments={signupDocs}
        latestMenu={latestMenu}
      />,
    );
  }, [pathname, signupDocs, latestMenu, setOverridePanel]);

  return <>{children}</>;
}
