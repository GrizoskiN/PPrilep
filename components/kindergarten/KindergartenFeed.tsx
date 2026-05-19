"use client";

import { useState } from "react";
import { formatDays } from "../../lib/utils";
import type { KindergartenPostType } from "../../lib/types/database";

interface Post {
  id: number;
  title: string;
  body: string | null;
  source_url: string | null;
  post_type: KindergartenPostType | null;
  posted_at: string;
}

const TABS: { key: KindergartenPostType | "all"; label: string; icon: string }[] = [
  { key: "all",          label: "Сите",         icon: "📋" },
  { key: "menu",         label: "Мени",         icon: "🍽️" },
  { key: "programme",    label: "Програма",     icon: "📅" },
  { key: "idea",         label: "Идеи",         icon: "💡" },
  { key: "announcement", label: "Соопштенија",  icon: "📢" },
];

const TYPE_STYLES: Record<KindergartenPostType, { border: string; bg: string; badge: string; text: string }> = {
  menu:         { border: "border-orange-200",  bg: "bg-orange-50",  badge: "bg-orange-100 text-orange-700",  text: "Мени" },
  programme:    { border: "border-blue-200",    bg: "bg-blue-50",    badge: "bg-blue-100 text-blue-700",      text: "Програма" },
  idea:         { border: "border-yellow-200",  bg: "bg-yellow-50",  badge: "bg-yellow-100 text-yellow-700",  text: "Идеја" },
  announcement: { border: "border-pink-200",    bg: "bg-pink-50",    badge: "bg-pink-100 text-pink-700",      text: "Соопштение" },
};

export default function KindergartenFeed({ posts }: { posts: Post[] }) {
  const [active, setActive] = useState<KindergartenPostType | "all">("all");

  const visible = active === "all" ? posts : posts.filter((p) => p.post_type === active);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
        {TABS.map((t) => {
          const count = t.key === "all"
            ? posts.length
            : posts.filter((p) => p.post_type === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active === t.key
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}>
              <span>{t.icon}</span>
              {t.label}
              <span className={`text-[10px] font-bold tabular-nums ${active === t.key ? "text-white/70" : "text-zinc-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Posts */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 py-12 text-center">
          <p className="text-sm text-zinc-400">Нема објави во оваа категорија.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((post) => {
            const style = post.post_type ? TYPE_STYLES[post.post_type] : null;
            return (
              <article
                key={post.id}
                className={`rounded-xl border p-4 space-y-2 ${style ? `${style.border} ${style.bg}` : "border-zinc-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-800 leading-snug">
                    {post.title}
                  </h3>
                  {style && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badge}`}>
                      {style.text}
                    </span>
                  )}
                </div>

                {post.body && (
                  <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-line">
                    {post.body}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-zinc-400">{formatDays(post.posted_at)}</p>
                  {post.source_url && (
                    <a
                      href={post.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-rose-500 hover:underline">
                      Повеќе →
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
