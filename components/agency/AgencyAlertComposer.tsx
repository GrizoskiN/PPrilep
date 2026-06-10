"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, AlertTriangle, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "../../lib/supabase/client";
import { DISTRICT_LABELS } from "../../lib/utils";
import StreetAutocomplete from "../issues/StreetAutocomplete";
import { prettyStreetName } from "../../lib/data/streets";
import type { District } from "../../lib/types/database";

const DISTRICTS: District[] = [
  "Center",
  "Varoš",
  "Trizla",
  "Točila",
  "Rid",
  "Tipski",
  "Boncejca",
  "KorzoMaalo",
];

type Audience = "street" | "district" | "all";

/**
 * Lets an institution operator publish a post/alert targeted at specific
 * streets, a whole district, or everyone (red alert). In-app notifications only.
 */
export default function AgencyAlertComposer({
  onPublished,
}: {
  onPublished?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("district");
  const [district, setDistrict] = useState<District>("Center");
  const [streets, setStreets] = useState<string[]>([]);
  const [streetInput, setStreetInput] = useState("");
  const [isRed, setIsRed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function addStreet(name?: string) {
    const s = (name ?? streetInput).trim();
    if (!s) return;
    if (!streets.includes(s)) setStreets((prev) => [...prev, s]);
    setStreetInput("");
  }

  function reset() {
    setTitle("");
    setBody("");
    setAudience("district");
    setStreets([]);
    setStreetInput("");
    setIsRed(false);
  }

  async function publish() {
    if (!title.trim()) {
      toast.error("Внеси наслов");
      return;
    }
    if (audience === "street" && streets.length === 0) {
      toast.error("Додади барем една улица");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("create_agency_post", {
      p_title: title.trim(),
      p_body: body.trim() || null,
      p_audience: audience,
      p_target_district: audience === "district" ? district : null,
      p_target_streets: audience === "street" ? streets : null,
      p_is_red_alert: audience === "all" ? isRed : false,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Соопштението е објавено");
    reset();
    setOpen(false);
    onPublished?.();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90">
        <Megaphone size={16} />
        Ново соопштение / алармирање
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-bold text-theme-heading">
          <Megaphone size={16} className="text-primary" /> Ново соопштение
        </p>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
          <X size={18} />
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Наслов (на пр. Прекин на вода)"
        className="mb-3 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Детали (опционално)"
        className="mb-3 w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
      />

      {/* Audience */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(
          [
            ["district", "Цела населба"],
            ["street", "Одредени улици"],
            ["all", "Сите граѓани"],
          ] as [Audience, string][]
        ).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setAudience(val)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              audience === val
                ? "border-primary bg-primary text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-primary/50"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {audience === "district" && (
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value as District)}
          className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary">
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {DISTRICT_LABELS[d] ?? d}
            </option>
          ))}
        </select>
      )}

      {audience === "street" && (
        <div className="mb-3">
          <div className="flex items-stretch gap-1.5">
            <div className="min-w-0 flex-1">
              <StreetAutocomplete
                value={streetInput}
                onChange={setStreetInput}
                placeholder="Име на улица (од базата)"
                onSelect={(s) => addStreet(prettyStreetName(s.name))}
              />
            </div>
            <button
              onClick={() => addStreet()}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-sm font-semibold text-zinc-600 hover:border-primary/50">
              <Plus size={14} /> Додај
            </button>
          </div>
          {streets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {streets.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                  {s}
                  <button
                    onClick={() =>
                      setStreets((prev) => prev.filter((x) => x !== s))
                    }
                    className="text-zinc-400 hover:text-zinc-600">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {audience === "all" && (
        <label className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2 text-xs text-red-700">
          <input
            type="checkbox"
            checked={isRed}
            onChange={(e) => setIsRed(e.target.checked)}
            className="mt-0.5"
          />
          <span className="flex items-center gap-1">
            <AlertTriangle size={13} />
            Итен алярм (црвено) — испрати известување до сите корисници
          </span>
        </label>
      )}

      <button
        onClick={publish}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60">
        {submitting ? "Се објавува…" : "Објави"}
      </button>
    </div>
  );
}
