"use client";

/**
 * Right-panel placeholder for the promise tracker.
 *
 * This used to render four invented promises — fake titles, fake deadlines and
 * progress bars hardcoded to 44%/76%. On a civic site that is worse than an
 * empty card: it reads as real municipal reporting, and nobody can tell our
 * placeholder from an actual council deadline. Stripped back to the heading and
 * a "наскоро" until it is backed by a real table.
 *
 * When the data lands, this is where it goes — keep the card shell, drop the
 * placeholder line.
 */

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuildingColumns } from "@fortawesome/free-solid-svg-icons";

export default function PromiseTracker() {
  return (
    <div className="lg:p-3">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="xl:flex items-start gap-3">
          <div className="mt-0.5 text-gray-400">
            <FontAwesomeIcon icon={faBuildingColumns} className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-gray-800">
              Следење на ветувања
            </h3>
            <p className="mt-1 text-xs leading-5 text-gray-500">Наскоро...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
