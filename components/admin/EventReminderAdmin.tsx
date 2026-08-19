"use client";

import { useState } from "react";

export type ReminderEvent = {
  _id: string;
  title: string;
  time: string | null;
  location: string;
  when: "today" | "tomorrow";
};

type SendState = "idle" | "sending" | "sent" | "error";

/**
 * Admin control: for each of today's/tomorrow's events, a button that pushes a
 * reminder to EVERY enabled device (calls /api/push/broadcast). Repeatable.
 */
export default function EventReminderAdmin({ events }: { events: ReminderEvent[] }) {
  const [state, setState] = useState<Record<string, SendState>>({});
  const [result, setResult] = useState<Record<string, string>>({});

  async function send(ev: ReminderEvent) {
    if (state[ev._id] === "sending") return;
    if (!confirm(`Испрати потсетник до сите за „${ev.title}“?`)) return;
    setState((s) => ({ ...s, [ev._id]: "sending" }));
    try {
      const res = await fetch("/api/push/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: ev._id }),
      });
      const json = (await res.json()) as { sent?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Грешка");
      setState((s) => ({ ...s, [ev._id]: "sent" }));
      setResult((r) => ({ ...r, [ev._id]: `Испратено до ${json.sent ?? 0} уреди` }));
    } catch (e) {
      setState((s) => ({ ...s, [ev._id]: "error" }));
      setResult((r) => ({ ...r, [ev._id]: e instanceof Error ? e.message : "Грешка" }));
    }
  }

  const groups: { key: "today" | "tomorrow"; label: string }[] = [
    { key: "today", label: "Денес" },
    { key: "tomorrow", label: "Утре" },
  ];

  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const list = events.filter((e) => e.when === g.key);
        return (
          <section key={g.key} className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {g.label}
            </h2>
            {list.length === 0 ? (
              <p className="text-xs text-zinc-500">Нема настани.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((ev) => {
                  const st = state[ev._id] ?? "idle";
                  return (
                    <li
                      key={ev._id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{ev.title}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {[ev.time, ev.location].filter(Boolean).join(" · ") || "—"}
                        </p>
                        {result[ev._id] && (
                          <p
                            className={`text-xs mt-0.5 ${
                              st === "error" ? "text-red-500" : "text-emerald-600"
                            }`}>
                            {result[ev._id]}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => send(ev)}
                        disabled={st === "sending"}
                        className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                        {st === "sending"
                          ? "Се испраќа…"
                          : st === "sent"
                            ? "Испрати повторно"
                            : "Потсети ги сите"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
