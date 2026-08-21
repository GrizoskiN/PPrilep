"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { urlForImage } from "../../lib/sanity/image";
import type { EventPoll as EventPollData } from "../../lib/sanity/queries";

/**
 * Single-choice poll on an event. The poll (question + options) comes from
 * Sanity; the votes come from /api/events/poll (service-role, hybrid identity).
 *
 * "My vote" is remembered locally (which option this browser picked), the same
 * way EventInterestButton remembers interest — the tallies endpoint returns
 * only aggregate counts. Tap an option to vote or switch; tap your current
 * option again to retract.
 */

const VOTES_KEY = "events_poll_votes"; // { [eventId]: optionKey }
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

function readMyVote(eventId: string): string | null {
  try {
    const raw = localStorage.getItem(VOTES_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as Record<string, string>)[eventId] ?? null;
  } catch {
    return null;
  }
}

function writeMyVote(eventId: string, optionKey: string | null) {
  try {
    const raw = localStorage.getItem(VOTES_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, string>;
    if (optionKey) map[eventId] = optionKey;
    else delete map[eventId];
    localStorage.setItem(VOTES_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export default function EventPoll({
  eventId,
  poll,
}: {
  eventId: string;
  poll: EventPollData;
}) {
  const [tallies, setTallies] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMine(readMyVote(eventId)), 0);
    let alive = true;
    fetch(`/api/events/poll?eventId=${encodeURIComponent(eventId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.tallies) setTallies(data.tallies as Record<string, number>);
      })
      .catch(() => {
        /* offline — show it as unvoted, still lets you cast */
      });
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [eventId]);

  const total = Object.values(tallies).reduce((a, b) => a + b, 0);
  const voted = mine !== null;
  // If the editor attached a picture to any option, render the whole poll as a
  // grid of tappable photo cards; otherwise fall back to the compact bar list.
  const hasImages = poll.options.some((o) => o.image);

  function vote(optionKey: string) {
    if (busy) return;
    const retracting = mine === optionKey;
    const action = retracting ? "remove" : "vote";
    const prev = mine;

    // Optimistic: move this browser's single vote between options (or clear it).
    setTallies((t) => {
      const next = { ...t };
      if (prev) next[prev] = Math.max(0, (next[prev] ?? 0) - 1);
      if (!retracting) next[optionKey] = (next[optionKey] ?? 0) + 1;
      return next;
    });
    const nextMine = retracting ? null : optionKey;
    setMine(nextMine);
    writeMyVote(eventId, nextMine);

    setBusy(true);
    fetch("/api/events/poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, optionKey, action, visitorId: getVisitorId() }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tallies) setTallies(data.tallies as Record<string, number>);
      })
      .catch(() => {
        /* keep optimistic value */
      })
      .finally(() => setBusy(false));
  }

  return (
    <section className="rounded-xl border border-theme bg-theme-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base">📊</span>
        <h2 className="text-sm font-semibold text-theme-heading">{poll.question}</h2>
      </div>

      {hasImages ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {poll.options.map((opt) => {
            const count = tallies[opt.key] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const chosen = mine === opt.key;
            const src = opt.image
              ? urlForImage(opt.image).width(600).height(800).fit("crop").url()
              : null;
            return (
              <button
                key={opt.key}
                onClick={() => vote(opt.key)}
                disabled={busy}
                aria-pressed={chosen}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-2 text-left transition-all disabled:opacity-70",
                  chosen
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-theme hover:border-primary/50",
                )}>
                {/* Photo */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-theme-canvas">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={opt.label}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl text-theme-subtle">
                      📷
                    </div>
                  )}
                  {/* Chosen tick */}
                  {chosen && (
                    <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow">
                      <Check size={14} />
                    </span>
                  )}
                  {/* Percentage badge — after voting */}
                  {voted && (
                    <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white">
                      {pct}%
                    </span>
                  )}
                </div>
                {/* Label + result bar */}
                <div className="relative px-2.5 py-2">
                  {voted && (
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 transition-[width] duration-500",
                        chosen ? "bg-primary/20" : "bg-theme-canvas",
                      )}
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  )}
                  <span className="relative block text-center text-sm font-medium text-theme-heading">
                    {opt.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {poll.options.map((opt) => {
            const count = tallies[opt.key] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const chosen = mine === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => vote(opt.key)}
                disabled={busy}
                aria-pressed={chosen}
                className={cn(
                  "relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-70",
                  chosen
                    ? "border-primary bg-primary-light"
                    : "border-theme bg-theme-surface hover:border-primary/50",
                )}>
                {/* Result bar — only after the reader has voted. */}
                {voted && (
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-lg transition-[width] duration-500",
                      chosen ? "bg-primary/20" : "bg-theme-canvas",
                    )}
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                )}
                <span className="relative flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-theme-heading">
                    {chosen && <Check size={14} className="text-primary" />}
                    {opt.label}
                  </span>
                  {voted && (
                    <span className="text-xs font-bold tabular-nums text-theme-muted">
                      {pct}%
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-2.5 text-xs text-theme-subtle">
        {total === 0
          ? "Биди прв да гласаш."
          : voted
            ? `${total} ${total === 1 ? "глас" : "гласови"} · допри повторно за да го тргнеш гласот`
            : `${total} ${total === 1 ? "глас" : "гласови"} · допри за да гласаш`}
      </p>
    </section>
  );
}
