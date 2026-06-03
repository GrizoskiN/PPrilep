import Link from "next/link";
import Image from "next/image";
import { fetchPositivePosts } from "../../../lib/sanity/queries";
import { urlForImage } from "../../../lib/sanity/image";

export const metadata = {
  title: "Позитива — Подобар Прилеп",
  description:
    "Добри вести од Прилеп — нови проекти, освоени награди, локални херои и сè што нè прави горди на нашиот град.",
};

export const revalidate = 60;

export default async function PositivePage() {
  const posts = await fetchPositivePosts();

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">☀️ Позитива</h1>
        <p className="text-sm text-slate-500">
          Добри вести од Прилеп — нови проекти, освоени награди, локални
          херои и сè што нè прави горди на нашиот град.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm font-medium text-zinc-700">
            Сè уште нема објавени приказни.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Наскоро ќе има што да прочитате тука.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            (() => {
              const tags = (p.tags ?? []).filter((t) => !!t?.title);
              return (
            <Link
              key={p._id}
              href={`/positive/${p.slug}`}
              className="block overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-colors hover:border-zinc-300">
              {p.coverImage && (
                <div className="relative aspect-video w-full bg-zinc-100">
                  <Image
                    src={urlForImage(p.coverImage).width(800).height(450).url()}
                    alt={p.coverImage.alt ?? p.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 624px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-4 space-y-2">
                <h2 className="text-base font-semibold text-zinc-900 leading-snug">
                  {p.title}
                </h2>
                {p.excerpt && (
                  <p className="text-sm text-zinc-600 leading-relaxed line-clamp-3">
                    {p.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1">
                  {p.author && <span>{p.author.name}</span>}
                  {p.author && <span>·</span>}
                  <time dateTime={p.publishedAt}>
                    {new Date(p.publishedAt).toLocaleDateString("mk-MK", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                  {tags.length > 0 && (
                    <>
                      <span>·</span>
                      <span className="truncate">
                        {tags.map((t) => t.title).join(", ")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
              );
            })()
          ))}
        </div>
      )}
    </div>
  );
}
