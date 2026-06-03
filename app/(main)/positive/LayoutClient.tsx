"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRightPanel } from "../../../lib/context/RightPanelContext";
import PositiveRightPanel from "../../../components/positive/PositiveRightPanel";
import type { PostListItem } from "../../../lib/sanity/queries";

interface Props {
  children: React.ReactNode;
  recentPosts: PostListItem[];
}

export default function PositiveLayoutClient({ children, recentPosts }: Props) {
  const { setOverridePanel } = useRightPanel();
  const pathname = usePathname();

  useEffect(() => {
    // Key the override to the current path so it shows on both /positive
    // and /positive/[slug] (the detail page).
    setOverridePanel(
      <PositiveRightPanel recentPosts={recentPosts} />,
      pathname,
      true,
    );
    return () => setOverridePanel(null);
  }, [setOverridePanel, recentPosts, pathname]);

  return <>{children}</>;
}
