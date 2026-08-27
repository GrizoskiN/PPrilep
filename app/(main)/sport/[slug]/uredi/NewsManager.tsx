"use client";

/**
 * Post and remove club announcements.
 *
 * Posts go live the moment they are saved — the account was vetted once when an
 * admin bound it to the club, and "уписот е отворен до петок" reviewed on
 * Monday is worthless. The list is loaded from the same public query the site
 * uses, so what the club sees here is exactly what the city sees.
 */

import { useCallback, useEffect, useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";

import { Field, inputCls } from "../../../../../components/sport/FormBits";
import type { SportNewsItem } from "../../../../../lib/sanity/sport";

export default function NewsManager({
  slug,
  clubName,
}: {
  slug: string;
  clubName: string;
}) {
  const [items, setItems] = useState<SportNewsItem[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sport/news/list?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      // An unreachable list must not block posting a new one.
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  // Arriving from the profile's „Нова објава" button (…/uredi#novosti) means the
  // club came here to post — open the composer straight away.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#novosti") {
      setOpen(true);
    }
  }, []);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);

    const form = new FormData();
    form.set("slug", slug);
    form.set("title", title);
    form.set("body", body);
    form.set("link", link);
    form.set("authorName", clubName);
    if (image) form.set("image", image);

    try {
      const res = await fetch("/api/sport/news", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Нешто тргна наопаку.");
      setTitle("");
      setBody("");
      setLink("");
      setImage(null);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Нешто тргна наопаку.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/sport/news?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="novosti" className="scroll-mt-20 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-theme-heading">Новости</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          <Plus className="h-3.5 w-3.5" /> Нова новост
        </button>
      </div>

      {open ? (
        <form onSubmit={publish} className="space-y-3 rounded-xl border border-zinc-200 p-3">
          <Field label="Наслов">
            <input
              className={inputCls}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Текст">
            <textarea
              className={inputCls}
              rows={4}
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          <Field label="Линк" hint="Пријава, настан или објава на друго место.">
            <input className={inputCls} value={link} onChange={(e) => setLink(e.target.value)} />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-teal-600">
            <ImagePlus className="h-4 w-4" />
            {image ? image.name : "Слика (по избор)"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-full bg-teal-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Се објавува…" : "Објави"}
          </button>
        </form>
      ) : null}

      {items.length === 0 ? (
        <p className="text-xs italic text-zinc-400">Сè уште нема објави.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
          {items.map((item) => (
            <li key={item._id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-theme-heading">{item.title}</p>
                {item.body ? (
                  <p className="line-clamp-2 text-xs text-theme-muted">{item.body}</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(item._id)}
                className="shrink-0 text-zinc-400 hover:text-red-500 disabled:opacity-40"
                aria-label="Избриши"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
