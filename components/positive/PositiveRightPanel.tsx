"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PenLine, LogIn } from "lucide-react";
import { urlForImage } from "../../lib/sanity/image";
import type { PostListItem } from "../../lib/sanity/queries";
import { useAuthContext as useAuth } from "../../lib/context/AuthContext";
import SubmitStoryModal from "./SubmitStoryModal";

interface Props {
  recentPosts: PostListItem[];
}

export default function PositiveRightPanel({ recentPosts }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <div className="space-y-4 lg:p-3">

        {/* ── CTA card ─────────────────────────────────────────── */}
        <section className="rounded-2xl border border-[#e4ece8] bg-white p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">
              ✍️ Сподели ја твојата вест
            </p>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              Имаш позитивна приказна од Прилеп? Пријавена акција, локален херој,
              постигнување во училиште? Кажи ни — ќе ја споделиме со целиот град.
            </p>
          </div>
          {user ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
              <PenLine size={14} />
              Испрати приказна
            </button>
          ) : (
            <Link
              href="/auth/login?next=/positive"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors">
              <LogIn size={14} />
              Најави се за да испратиш
            </Link>
          )}
        </section>

        {/* ── Recent posts ─────────────────────────────────────── */}
        {recentPosts.length > 0 && (
          <section className="rounded-2xl border border-[#e4ece8] bg-white p-3 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-theme-subtle">
              Последни вести
            </p>
            <div className="space-y-2">
              {recentPosts.map((post) => {
                const coverUrl = post.coverImage
                  ? urlForImage(post.coverImage).width(120).height(80).fit("crop").url()
                  : null;
                return (
                  <Link
                    key={post._id}
                    href={`/positive/${post.slug}`}
                    className="flex gap-2.5 rounded-xl p-2 transition-colors hover:bg-slate-50">
                    {coverUrl ? (
                      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <Image src={coverUrl} alt={post.title} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl">
                        ☀️
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-800">
                        {post.title}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {new Date(post.publishedAt).toLocaleDateString("mk-MK", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
            <Link
              href="/positive"
              className="block rounded-xl border border-dashed border-[#cfe0da] py-2 text-center text-[11px] font-semibold text-primary hover:bg-[#f0faf7] transition-colors">
              Сите вести →
            </Link>
          </section>
        )}
      </div>

      {modalOpen && (
        <SubmitStoryModal
          onClose={() => setModalOpen(false)}
          userEmail={user?.email}
          userName={user?.user_metadata?.full_name ?? null}
        />
      )}
    </>
  );
}
