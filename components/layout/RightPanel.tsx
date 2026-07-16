"use client";

import PromiseTracker from "../ui/PromiseTracker";
import EventSpotlight from "../ui/EventSpotlight";
import PublicSponsorPanel from "../ui/PublicSponsorPanel";

/**
 * Default right panel for routes without a custom one (home, issues, heroes,
 * communities): the local-government promise tracker, the featured/next city
 * event, then the real sponsors panel (current partners + apply button).
 */
export default function RightPanel() {
  return (
    <aside className="flex h-auto flex-col gap-3 overflow-y-auto bg-transparent text-sm lg:gap-0 xl:text-base">
      <PromiseTracker />
      <EventSpotlight />
      <PublicSponsorPanel />
      
      {/* Footer / Legal Links */}
      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-400 px-1 pb-8">
        <a href="/privacy" className="hover:text-zinc-600 transition-colors">Политика за приватност</a>
        <a href="/terms" className="hover:text-zinc-600 transition-colors">Услови за користење</a>
        <a href="/data-deletion" className="hover:text-zinc-600 transition-colors">Бришење податоци</a>
        <a href="/support" className="hover:text-zinc-600 transition-colors">Поддршка</a>
        <span className="w-full mt-2">&copy; {new Date().getFullYear()} Мој Прилеп</span>
      </div>
    </aside>
  );
}
