"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, ImagePlus, Save, X } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import {
  saveInitiativeProgress,
  setInitiativeStage,
} from "../../app/actions/initiatives";
import { STAGE_LABEL } from "../../lib/initiatives";
import type { InitiativeStage } from "../../lib/types/database";

/** Stages a manager can move an initiative through, in pipeline order. */
const MANAGE_STAGES: InitiativeStage[] = [
  "idea",
  "voting",
  "funding",
  "completed",
  "rejected",
];

/** Cap on progress/completion photos per initiative. */
const MAX_IMAGES = 5;

interface Props {
  initiativeId: string;
  stage: InitiativeStage;
  completionNote: string | null;
  completionImages: string[];
  /** Called after any successful change so the parent can refresh. */
  onChanged?: () => void;
}

/**
 * Owner/admin-only controls inside the initiative detail modal: change the
 * stage and maintain a progress/completion note + photo gallery. Photos are
 * uploaded client-side to the `initiative-images` bucket (mirrors the create
 * form, avoiding server-action body limits); the URLs are then persisted via
 * the saveInitiativeProgress server action. RLS enforces owner-or-admin.
 */
export default function InitiativeManagePanel({
  initiativeId,
  stage,
  completionNote,
  completionImages,
  onChanged,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [curStage, setCurStage] = useState<InitiativeStage>(stage);

  const [note, setNote] = useState(completionNote ?? "");
  const [images, setImages] = useState<string[]>(completionImages ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Chips only *select* the stage locally — nothing is persisted until the
  // single "Зачувај" button below, so the note and photos are always saved
  // together with the stage change (never silently discarded).
  function pickStage(next: InitiativeStage) {
    setCurStage(next);
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Сесијата истече, најавете се повторно");
      return;
    }
    // Hard cap at MAX_IMAGES total — silently drop the overflow so the picker
    // never quietly exceeds the limit even if the user reopened it.
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Максимум ${MAX_IMAGES} слики`);
      return;
    }
    const picked = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      toast.info(`Само првите ${remaining} слики беа додадени (лимит ${MAX_IMAGES}).`);
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of picked) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("initiative-images")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) {
          toast.error(`Грешка при прикачување: ${upErr.message}`);
          continue;
        }
        urls.push(
          supabase.storage.from("initiative-images").getPublicUrl(path).data
            .publicUrl,
        );
      }
      if (urls.length) setImages((prev) => [...prev, ...urls]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (curStage === "completed" && stage !== "completed") {
      if (
        !window.confirm(
          "Означи ја иницијативата како реализирана? Забелешката и сликите ќе се зачуваат.",
        )
      )
        return;
    }
    setSaving(true);
    // Persist the note + photos first so they're never lost, then apply the
    // stage change (only if it actually changed).
    const prog = await saveInitiativeProgress(initiativeId, { note, images });
    if (!prog.success) {
      setSaving(false);
      toast.error(
        prog.error === "NOT_AUTHENTICATED" ? "Најавете се повторно" : prog.error,
      );
      return;
    }
    if (curStage !== stage) {
      const st = await setInitiativeStage(initiativeId, curStage);
      if (!st.success) {
        setSaving(false);
        toast.error(
          st.error === "NOT_AUTHENTICATED" ? "Најавете се повторно" : st.error,
        );
        return;
      }
    }
    setSaving(false);
    toast.success("Зачувано");
    onChanged?.();
  }

  return (
    <section className="rounded-xl border border-zinc-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700">
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Ажурирај иницијатива
      </button>

      {open && (
        <div className="space-y-4 border-t border-zinc-200 p-4">
          {/* Stage */}
          <div>
            <label
              htmlFor="init-stage-select"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Статус
            </label>
            <select
              id="init-stage-select"
              value={curStage}
              disabled={saving}
              onChange={(e) => pickStage(e.target.value as InitiativeStage)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none disabled:opacity-60">
              {MANAGE_STAGES.map((st) => (
                <option key={st} value={st}>
                  {STAGE_LABEL[st]}
                </option>
              ))}
            </select>
          </div>

          {/* Progress / completion note */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Забелешка за напредок / реализација
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Опиши што е направено…"
              className="w-full resize-y rounded-lg border border-zinc-300 p-3 text-sm text-slate-900 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Photos */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Слики ({images.length}/{MAX_IMAGES})
            </p>
            <div className="flex flex-wrap gap-2">
              {images.map((url, i) => (
                <div key={url} className="relative h-20 w-20">
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="80px"
                    className="rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setImages((prev) => prev.filter((_, j) => j !== i))
                    }
                    aria-label="Отстрани"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-primary text-primary disabled:opacity-60">
                  <ImagePlus size={18} />
                  <span className="text-[11px] font-semibold">
                    {uploading ? "…" : "Слика"}
                  </span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving || uploading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60">
            <Save size={14} />
            {saving
              ? "Се зачувува…"
              : curStage !== stage
                ? `Зачувај и стави „${STAGE_LABEL[curStage]}“`
                : "Зачувај промени"}
          </button>
        </div>
      )}
    </section>
  );
}
