"use client";

import PromiseTracker from "../ui/PromiseTracker";
import PublicSponsorPanel from "../ui/PublicSponsorPanel";

/**
 * Default right panel for routes without a custom one (home, issues, heroes,
 * communities): the local-government promise tracker + the real sponsors panel
 * (current partners + apply button).
 */
export default function RightPanel() {
  return (
    <aside className="flex h-auto flex-col gap-3 overflow-y-auto bg-transparent lg:gap-0 lg:text-sm xl:text-base">
      <PromiseTracker />
      <PublicSponsorPanel />
    </aside>
  );
}
