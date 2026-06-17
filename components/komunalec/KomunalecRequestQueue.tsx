"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Inbox, Phone } from "lucide-react";
import {
  fetchKomunalecRequests,
  setKomunalecRequestStatus,
} from "../../app/actions/komunalec";
import type {
  KomunalecRequest,
  KomunalecRequestStatus,
} from "../../lib/types/database";

const TYPE_LABELS: Record<string, string> = {
  complaint: "Поплака",
  container: "Контејнер",
  tractor: "Трактор",
};
const CATEGORY_LABELS: Record<string, string> = {
  garbage: "Ѓубре",
  park: "Парк",
};
const STATUSES: [KomunalecRequestStatus, string][] = [
  ["new", "Ново"],
  ["in_progress", "Во тек"],
  ["done", "Завршено"],
  ["rejected", "Одбиено"],
];
const STATUS_CLASS: Record<KomunalecRequestStatus, string> = {
  new: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
  rejected: "bg-zinc-200 text-zinc-600",
};

/** Operator/admin inbox of Комуналец requests, with status controls. */
export default function KomunalecRequestQueue() {
  const [rows, setRows] = useState<KomunalecRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKomunalecRequests().then((res) => {
      if (res.data) setRows(res.data as KomunalecRequest[]);
      setLoading(false);
    });
  }, []);

  async function changeStatus(id: number, status: KomunalecRequestStatus) {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const res = await setKomunalecRequestStatus(id, status);
    if (res?.error) {
      setRows(prev);
      toast.error(res.error);
    }
  }

  if (loading) {
    return <p className="text-xs text-theme-subtle">Се вчитуваат барањата…</p>;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-theme-heading">
        <Inbox size={16} className="text-primary" /> Барања ({rows.length})
      </p>

      {rows.length === 0 ? (
        <p className="text-xs text-theme-subtle">Нема барања.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-zinc-100 p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-theme-heading">
                  {TYPE_LABELS[r.request_type] ?? r.request_type}
                </span>
                {r.category && (
                  <span className="text-xs text-theme-muted">
                    · {CATEGORY_LABELS[r.category] ?? r.category}
                  </span>
                )}
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[r.status]}`}>
                  {STATUSES.find(([s]) => s === r.status)?.[1] ?? r.status}
                </span>
              </div>
              <p className="text-theme-body">
                {r.full_name}
                {(r.address || r.district) && (
                  <span className="text-theme-muted">
                    {" "}
                    · {[r.address, r.district].filter(Boolean).join(", ")}
                  </span>
                )}
              </p>
              <a
                href={`tel:${r.phone}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                <Phone size={12} /> {r.phone}
              </a>
              {r.scheduled_at && (
                <p className="mt-1 text-xs font-medium text-primary">
                  📅 Термин:{" "}
                  {new Date(r.scheduled_at).toLocaleString("mk-MK", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
              {r.message && (
                <p className="mt-1 text-xs text-theme-muted">{r.message}</p>
              )}
              {r.photo_url && (
                <a
                  href={r.photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-primary underline">
                  Слика
                </a>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {STATUSES.map(([s, label]) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(r.id, s)}
                    disabled={r.status === s}
                    className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                      r.status === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-zinc-200 text-zinc-500 hover:border-primary/40"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
