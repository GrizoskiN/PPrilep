"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IssueDetail from "../../../../components/issues/IssueDetail";
import DateOffersPanel from "../../../../components/issues/DateOffersPanel";
import BeforeAfterSlider from "../../../../components/ui/BeforeAfterSlider";
import type { Issue } from "../../../../lib/types/database";

interface Props {
  issue: Issue;
  userId?: string;
}

export default function IssuePageClient({ issue, userId }: Props) {
  const router = useRouter();
  const [datesOpen, setDatesOpen] = useState(false);
  const [datesAnimOpen, setDatesAnimOpen] = useState(false);

  function openDates() {
    setDatesOpen(true);
    requestAnimationFrame(() => setDatesAnimOpen(true));
  }

  function closeDates() {
    setDatesAnimOpen(false);
    setTimeout(() => setDatesOpen(false), 280);
  }

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/issues");
  }

  return (
    <>
      {/* ── Desktop: exact same layout as the IssueList modal ── */}
      <div className="hidden lg:flex fixed inset-0 z-70 bg-black/95">
        {/* Photo area — shrinks when dates panel is open */}
        <div className="flex-1 min-w-0 flex items-center justify-center bg-black p-6">
          {issue.photo_url && issue.after_photo_url ? (
            <div className="w-full max-w-3xl">
              <BeforeAfterSlider
                beforeSrc={issue.photo_url}
                afterSrc={issue.after_photo_url}
                alt={issue.title}
                maxHeight="82vh"
                showLabels
              />
            </div>
          ) : issue.photo_url || issue.after_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(issue.photo_url ?? issue.after_photo_url)!}
              alt={issue.title}
              className="max-w-full object-contain rounded-xl"
              style={{ maxHeight: "82vh" }}
            />
          ) : (
            <div className="text-zinc-600 text-sm">Нема фотографија</div>
          )}
        </div>

        {/* Dates panel — slides in */}
        <div
          className={`shrink-0 h-full bg-white border-r border-zinc-100 flex flex-col overflow-hidden transition-all duration-300 ease-out ${datesOpen ? "w-80 opacity-100" : "w-0 opacity-0 pointer-events-none"}`}>
          {datesOpen && (
            <DateOffersPanel
              issueId={issue.id}
              issueTitle={issue.title}
              userId={userId}
              onClose={closeDates}
            />
          )}
        </div>

        {/* Detail panel */}
        <div className="w-105 shrink-0 bg-white flex flex-col overflow-y-auto">
          <IssueDetail
            issue={issue}
            userId={userId}
            hideImage
            onClose={goBack}
            onOpenDates={() => (datesOpen ? closeDates() : openDates())}
          />
        </div>
      </div>

      {/* ── Mobile: full-page white layout ── */}
      <div className="lg:hidden min-h-screen bg-white">
        <IssueDetail
          issue={issue}
          userId={userId}
          onClose={goBack}
          onOpenDates={openDates}
        />

        {/* Mobile dates bottom sheet */}
        {datesOpen && (
          <>
            <div
              className="fixed inset-0 z-58 bg-black/30 transition-opacity duration-300"
              style={{ opacity: datesAnimOpen ? 1 : 0 }}
              onClick={closeDates}
            />
            <div
              className="fixed bottom-0 left-0 right-0 z-59 bg-white rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out"
              style={{
                maxHeight: "88dvh",
                transform: datesAnimOpen ? "translateY(0)" : "translateY(100%)",
              }}>
              <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab">
                <div className="h-1.5 w-12 rounded-full bg-zinc-300" />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <DateOffersPanel
                  issueId={issue.id}
                  issueTitle={issue.title}
                  userId={userId}
                  onClose={closeDates}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
