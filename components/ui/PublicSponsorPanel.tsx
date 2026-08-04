"use client";

import PartnerStrip from "../sponsors/PartnerStrip";

/**
 * Default right-panel partners block. All of the behaviour lives in
 * PartnerStrip, which the About panel shares — this file exists only so the
 * layout keeps importing a stable name.
 */
export default function PublicSponsorPanel() {
  return (
    <div className="space-y-4 lg:p-3">
      <PartnerStrip />
    </div>
  );
}
