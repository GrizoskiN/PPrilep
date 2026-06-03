"use client";

import { useEffect } from "react";
import { useRightPanel } from "../../../lib/context/RightPanelContext";
import PositiveRightPanel from "../../../components/positive/PositiveRightPanel";
import type { PostListItem } from "../../../lib/sanity/queries";

interface Props {
  children: React.ReactNode;
  recentPosts: PostListItem[];
}

export default function PositiveLayoutClient({ children, recentPosts }: Props) {
  const { setOverridePanel } = useRightPanel();

  useEffect(() => {
    // exact: false → matches /positive AND /positive/[slug]
    setOverridePanel(<PositiveRightPanel recentPosts={recentPosts} />, "/positive", false);
    return () => setOverridePanel(null);
  }, [setOverridePanel, recentPosts]);

  return <>{children}</>;
}
