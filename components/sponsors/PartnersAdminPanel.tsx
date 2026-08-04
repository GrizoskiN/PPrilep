"use client";

/**
 * Admin-only: add local businesses as partners without them applying or having
 * an account. Writes straight to `partners` — RLS restricts every statement
 * here to admins, so there is no RPC to go through.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Building2, Plus, Eye, EyeOff, Trash2, Upload, Pencil } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "../../lib/supabase/client";
import { bucketObjectPath } from "../../lib/utils";
import type { ManualPartner } from "../../lib/partners";

const TIER_OPTIONS = [
  { value: "company_basic", label: "Партнер" },
  { value: "company_preferred", label: "Партнер+" },
  { value: "company_premium", label: "Премиум" },
];

const EMPTY = {
  name: "",
  tier: "company_basic",
  logo_url: "",
  website: "",
  phone: "",
  note: "",
  sort: "0",
};

export default function PartnersAdminPanel({ onChange }: { onChange?: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<ManualPartner[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  // null = the form is adding; an id = it is editing that partner.
  const [editingId, setEditingId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Admins see inactive rows too (the RLS policy allows it), so the panel can
  // show what the public list is currently hiding.
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("partners")
      .select("*")
      .order("sort", { ascending: true });
    setRows((data as ManualPartner[] | null) ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  /** Upload a logo to the partner-logos bucket and keep its public URL. */
  async function uploadLogo(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Изберете слика.");
      return;
    }
    // Logos are small by nature; a multi-MB file here is a mistake, not intent.
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Логото е преголемо (макс. 2MB).");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("partner-logos")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    setUploading(false);
    if (error) {
      toast.error(`Грешка при прикачување: ${error.message}`);
      return;
    }
    const { publicUrl } = supabase.storage.from("partner-logos").getPublicUrl(path).data;
    set("logo_url", publicUrl);
    toast.success("Логото е прикачено.");
  }

  async function add() {
    const name = form.name.trim();
    if (!name) return;
    setBusy(true);
    // Empty text inputs are stored as NULL, not "", so `website` staying blank
    // makes the card inert rather than linking to nowhere.
    const values = {
      name,
      tier: form.tier,
      logo_url: form.logo_url.trim() || null,
      website: form.website.trim() || null,
      phone: form.phone.trim() || null,
      note: form.note.trim() || null,
      sort: Number(form.sort) || 0,
    };
    const { error } = editingId
      ? await supabase.from("partners").update(values).eq("id", editingId)
      : await supabase.from("partners").insert(values);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? `${name} е зачуван.` : `${name} е додаден како партнер.`);
    resetForm();
    await load();
    onChange?.();
  }

  function resetForm() {
    setForm({ ...EMPTY });
    setEditingId(null);
    setOpen(false);
  }

  /** Load an existing partner into the form for editing. */
  function startEdit(p: ManualPartner) {
    setForm({
      name: p.name,
      tier: p.tier,
      logo_url: p.logo_url ?? "",
      website: p.website ?? "",
      phone: p.phone ?? "",
      note: p.note ?? "",
      sort: String(p.sort),
    });
    setEditingId(p.id);
    setOpen(true);
  }

  async function toggle(p: ManualPartner) {
    const { error } = await supabase
      .from("partners")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    await load();
    onChange?.();
  }

  async function remove(p: ManualPartner) {
    if (!confirm(`Да се избрише „${p.name}“ засекогаш?`)) return;
    const { error } = await supabase.from("partners").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    // Storage has no DB cascade — drop the logo too, or it lingers forever.
    const path = bucketObjectPath(p.logo_url, "partner-logos");
    if (path) await supabase.storage.from("partner-logos").remove([path]);
    toast.success("Избришан.");
    await load();
    onChange?.();
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Building2 size={18} className="text-zinc-500" />
        <h2 className="text-base font-bold text-zinc-900">Рачно внесени партнери</h2>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">
          {rows.length}
        </span>
        <button
          onClick={() => (open ? resetForm() : setOpen(true))}
          className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: "#2aa99d" }}>
          <Plus size={14} />
          {open ? "Откажи" : "Нов партнер"}
        </button>
      </div>

      {open && (
        <div className="mb-4 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Име на бизнисот *"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.tier}
              onChange={(e) => set("tier", e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary">
              {TIER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input
              value={form.sort}
              onChange={(e) => set("sort", e.target.value)}
              inputMode="numeric"
              placeholder="Редослед (0)"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <input
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="Веб-страна (https://…)"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-white p-3">
            {form.logo_url ? (
              <Image
                src={form.logo_url}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-lg object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                <Building2 size={20} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-700">Лого</p>
              <p className="truncate text-[11px] text-zinc-400">
                {uploading ? "Се прикачува…" : form.logo_url ? "Прикачено" : "PNG или JPG, макс. 2MB"}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Reset so re-picking the same file still fires onChange.
                e.target.value = "";
                if (file) uploadLogo(file);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">
              <Upload size={13} />
              {form.logo_url ? "Замени" : "Избери"}
            </button>
          </div>
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="Телефон"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Забелешка (само за вас)"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={add}
            disabled={busy || !form.name.trim()}
            className="w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "#2aa99d" }}>
            {busy ? "Се зачувува…" : editingId ? "Зачувај промени" : "Додади"}
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-zinc-400">Нема рачно внесени партнери.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2 ${p.is_active ? "" : "opacity-50"}`}>
              {p.logo_url ? (
                <Image
                  src={p.logo_url}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-lg object-contain"
                  unoptimized
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                  <Building2 size={14} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-800">{p.name}</p>
                <p className="truncate text-[11px] text-zinc-400">
                  {TIER_OPTIONS.find((t) => t.value === p.tier)?.label ?? p.tier}
                  {p.website ? ` · ${p.website}` : ""}
                  {p.is_active ? "" : " · скриен"}
                </p>
              </div>
              <button
                onClick={() => startEdit(p)}
                title="Измени"
                className={`rounded-lg border p-1.5 hover:bg-zinc-50 ${editingId === p.id ? "border-primary text-primary" : "border-zinc-200 text-zinc-500"}`}>
                <Pencil size={14} />
              </button>
              <button
                onClick={() => toggle(p)}
                title={p.is_active ? "Сокриј" : "Прикажи"}
                className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-50">
                {p.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={() => remove(p)}
                title="Избриши"
                className="rounded-lg border border-zinc-200 p-1.5 text-red-500 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
