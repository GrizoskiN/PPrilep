"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bus } from "lucide-react";
import { fetchBuses, updateBus, type BusRow } from "../../app/actions/buses";
import { BUS_ROUTES } from "../../lib/data/busRoutes";
import { plateForLabel } from "../../lib/data/busPlates";

/**
 * Operator panel (Јавен превоз account + admins): reassign each bus to a line
 * and toggle it in/out of service. Takes effect on the live map within ~15s.
 */
export default function BusLineManager() {
  const [rows, setRows] = useState<BusRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuses().then((res) => {
      if (res.data) setRows(res.data);
      setLoading(false);
    });
  }, []);

  async function patchBus(
    id: number,
    patch: { active_line_id?: string | null; is_active?: boolean },
  ) {
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const res = await updateBus(id, patch);
    if (res.error) {
      setRows(prev);
      toast.error("Грешка при зачувување");
    } else {
      toast.success("Зачувано");
    }
  }

  if (loading) {
    return <p className="text-xs text-zinc-400">Се вчитува…</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-xs text-zinc-400">
        Нема внесени автобуси.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700">
        <Bus size={15} className="text-zinc-400" />
        Управување со линии
      </h3>
      <p className="text-[11px] text-zinc-400">
        Промена на линијата се прикажува на мапата за ~15 секунди.
      </p>

      <div className="space-y-2">
        {rows.map((bus) => (
          <div
            key={bus.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-2">
            <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-[13px] font-medium text-zinc-700">
              {bus.label}
              {plateForLabel(bus.label) && (
                <span className="rounded-md border border-zinc-200 bg-white px-1.5 py-px font-mono text-[11px] font-semibold tracking-wide text-zinc-600">
                  {plateForLabel(bus.label)}
                </span>
              )}
            </span>

            <select
              value={bus.active_line_id ?? ""}
              onChange={(e) =>
                patchBus(bus.id, { active_line_id: e.target.value || null })
              }
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[13px] text-zinc-700">
              <option value="">— без линија —</option>
              {BUS_ROUTES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 text-[12px] text-zinc-600">
              <input
                type="checkbox"
                checked={bus.is_active}
                onChange={(e) => patchBus(bus.id, { is_active: e.target.checked })}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              Во служба
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
