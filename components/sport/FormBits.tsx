"use client";

/**
 * The shared field furniture for the two sport forms — /sport/nov (пријава) and
 * /sport/[slug]/uredi (уредување). They ask for the same things in the same
 * shapes, so a club sees the same controls when it edits as when it applied.
 */

export const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

/** The fixed chip order for the age picker. */
export const AGE_ORDER = ["4-6", "7-11", "12-15", "16-18", "18+", "recreation", "veterans"];

/** Week order for the day pickers — Monday first, Sunday last. */
export const DAY_ORDER = ["1", "2", "3", "4", "5", "6", "0"];

/** Latin letters in a field that should be Cyrillic. URLs/emails never get this. */
export const LATIN = /[a-zA-Z]/;

export type Slot = {
  group: string;
  days: string[];
  startTime: string;
  endTime: string;
  venue: string;
};
export type Price = { label: string; price: string; period: string; note: string };

export const EMPTY_SLOT: Slot = {
  group: "",
  days: [],
  startTime: "",
  endTime: "",
  venue: "",
};
export const EMPTY_PRICE: Price = { label: "", price: "", period: "month", note: "" };

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-zinc-700">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-zinc-400">{hint}</span> : null}
    </label>
  );
}

export function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-teal-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
