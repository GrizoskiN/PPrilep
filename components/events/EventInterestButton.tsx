"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "../../lib/utils";

// Self-contained "Заинтересиран" button for the standalone event page. Mirrors
// the toggle logic in EventsExplorer but for a single event: own interest state
// (localStorage) + count (fetched from the counts endpoint) + hybrid POST.

const STORAGE_KEY = "events_interested";
const VISITOR_KEY = "pp_visitor_id";

function getVisitorId(): string {
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return "";
  }
}

export default function EventInterestButton({ eventId }: { eventId: string }) {
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Deferred so the initial localStorage read isn't a synchronous setState in
    // the effect body (matches EventsExplorer).
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setActive((JSON.parse(raw) as string[]).includes(eventId));
      } catch { /* ignore */ }
    }, 0);

    let alive = true;
    fetch("/api/events/interest")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.counts) setCount(data.counts[eventId] ?? 0);
      })
      .catch(() => { /* ignore */ });
    return () => { alive = false; clearTimeout(t); };
  }, [eventId]);

  function toggle() {
    const adding = !active;
    setActive(adding);
    setCount((c) => Math.max(0, c + (adding ? 1 : -1)));

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const set = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
      if (adding) set.add(eventId);
      else set.delete(eventId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    } catch { /* ignore */ }

    fetch("/api/events/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        action: adding ? "add" : "remove",
        visitorId: getVisitorId(),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.count === "number") setCount(data.count);
      })
      .catch(() => { /* keep optimistic value */ });
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-white hover:bg-primary/90"
          : "bg-primary-light text-primary hover:bg-primary/15",
      )}>
      <Star size={15} className={active ? "fill-white" : ""} />
      {active ? "Заинтересиран ✓" : "Заинтересиран"}
      {count > 0 && (
        <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold tabular-nums text-primary shadow-sm">
          {count}
        </span>
      )}
    </button>
  );
}
