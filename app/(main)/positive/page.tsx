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
  const [featured, ...rest] = posts;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-theme-heading">☀️ Позитива</h1>
        <p className="text-sm text-theme-muted">
          Добри вести од Прилеп — нови проекти, освоени награди, локални херои
          и сè што нè прави горди на нашиот град.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e4ece8] bg-white p-12 text-center space-y-2">
          <p className="text-3xl">☀️</p>
          <p className="text-sm font-semibold text-slate-700">Наскоро...</p>
          <p className="text-sm text-slate-400">
            Прв напис е во подготовка. Или — биди ти прв и испрати ни приказна!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Featured — first post, full width */}
          {featured && (
            <Link
              href={`/positive/${featured.slug}`}
              className="group block overflow-hidden rounded-2xl border border-[#e4ece8] bg-white transition-all hover:border-[#cfe0da] hover:shadow-md">
              {featured.coverImage && (
                <div className="relative aspect-[16/7] w-full bg-slate-100">
                  <Image
                    src={urlForImage(featured.coverImage).width(1200).height(525).url()}
                    alt={featured.coverImage.alt ?? featured.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 624px"
                    priority
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    ⭐ Последна вест
                  </span>
                </div>
              )}
              <div className="p-4 space-y-2">
                <h2 className="text-base font-bold text-slate-900 leading-snug group-hover:text-primary transition-colors">
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                    {featured.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                  {featured.author && <span className="font-medium text-slate-500">{featured.author.name}</span>}
                  {featured.author && <span>·</span>}
                  <time dateTime={featured.publishedAt}>
                    {new Date(featured.publishedAt).toLocaleDateString("mk-MK", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </time>
                  {featured.tags.length > 0 && (
                    <>
                      <span>·</span>
                      {featured.tags.slice(0, 2).map((t) => (
                        <span key={t.slug} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {t.title}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* Rest — 2-column grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {rest.map((p) => (
                <Link
                  key={p._id}
                  href={`/positive/${p.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-[#e4ece8] bg-white transition-all hover:border-[#cfe0da] hover:shadow-md">
                  {p.coverImage ? (
                    <div className="relative h-36 w-full bg-slate-100">
                      <Image
                        src={urlForImage(p.coverImage).width(600).height(300).url()}
                        alt={p.coverImage.alt ?? p.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-gradient-to-br from-[#f0faf7] to-[#e8f5f0] text-4xl">
                      ☀️
                    </div>
                  )}
                  <div className="p-3.5 space-y-1.5">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800 group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-500">
                        {p.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-slate-400">
                      <time dateTime={p.publishedAt}>
                        {new Date(p.publishedAt).toLocaleDateString("mk-MK", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </time>
                      {p.tags.slice(0, 1).map((t) => (
                        <span key={t.slug} className="rounded-full bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500">
                          {t.title}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
