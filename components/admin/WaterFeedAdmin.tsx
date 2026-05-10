"use client";

import { useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { formatDays } from "../../lib/utils";
import { Trash2, Plus, Loader2 } from "lucide-react";
import type { IssueStatus } from "../../lib/types/database";

interface Post {
  id: number;
  title: string;
  body: string | null;
  status: string | null;
  posted_at: string;
}

const STATUS_OPTIONS: { value: IssueStatus | ""; label: string }[] = [
  { value: "", label: "Без статус (само инфо)" },
  { value: "open", label: "🔴 Активен прекин" },
  { value: "progress", label: "🟡 Во тек" },
  { value: "resolved", label: "🟢 Решено" },
];

export default function WaterFeedAdmin({ initial }: { initial: Post[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<Post[]>(initial);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<IssueStatus | "">("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("utility_posts")
      .insert({
        provider: "water",
        title: title.trim(),
        body: body.trim() || null,
        status: status || null,
        posted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (err) {
      setError(err.message);
    } else if (data) {
      setPosts((prev) => [data as Post, ...prev]);
      setTitle("");
      setBody("");
      setStatus("");
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    await supabase.from("utility_posts").delete().eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-800">Додај нова објава</h2>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600">Наслов *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="пр. Прекин на водоснабдување — Центар"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600">Опис</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Детали за прекинот, засегнати улици, очекувано траење..."
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600">Статус</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as IssueStatus | "")}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-primary/90 transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Објави
        </button>
      </form>

      {/* Posts list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-700">
          Постоечки објави ({posts.length})
        </h2>
        {posts.length === 0 && (
          <p className="text-xs text-zinc-400">Нема објави.</p>
        )}
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-start gap-3 bg-white border border-zinc-200 rounded-xl p-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 truncate">{post.title}</p>
              {post.body && (
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{post.body}</p>
              )}
              <p className="text-[11px] text-zinc-400 mt-1">{formatDays(post.posted_at)}</p>
            </div>
            <button
              onClick={() => handleDelete(post.id)}
              disabled={deletingId === post.id}
              className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40">
              {deletingId === post.id
                ? <Loader2 size={14} className="animate-spin" />
                : <Trash2 size={14} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
