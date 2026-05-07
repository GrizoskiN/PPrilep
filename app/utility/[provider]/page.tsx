import { createClient } from "../../../lib/supabase/server";
import Link from "next/link";
import Shell from "../../../components/layout/Shell";
import StatusPill from "../../../components/ui/StatusPill";
import { formatDays } from "../../../lib/utils";
import type { Provider, IssueStatus } from "../../../lib/types/database";
import { notFound } from "next/navigation";

const PROVIDERS: Provider[] = ["water", "garbage", "power"];
const PROVIDER_LABELS: Record<Provider, string> = {
  water: "Водовод",
  garbage: "Комунален отпад",
  power: "Електрична енергија",
};
const PROVIDER_ICONS: Record<Provider, string> = {
  water: "💧",
  garbage: "🗑️",
  power: "⚡",
};

const FB_PAGE_URL = "https://www.facebook.com/JKP.VIK.PP/";

interface Props {
  params: Promise<{ provider: string }>;
}

export default async function UtilityPage({ params }: Props) {
  const { provider } = await params;
  if (!PROVIDERS.includes(provider as Provider)) notFound();
  const p = provider as Provider;

  const supabase = await createClient();

  const [{ data: posts }, { data: fbUrls }] = await Promise.all([
    supabase
      .from("utility_posts")
      .select("*")
      .eq("provider", p)
      .order("posted_at", { ascending: false }),
    p === "water"
      ? supabase
          .from("fb_post_urls")
          .select("id, url")
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <Shell>
      <div className="p-4 lg:p-6 space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-base font-semibold">
            {PROVIDER_ICONS[p]} {PROVIDER_LABELS[p]}
          </h1>
          <p className="text-xs text-zinc-500">
            Официјални соопштенија од комуналното претпријатие
          </p>
        </div>

        {/* Internal utility posts */}
        {posts && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white border border-zinc-200 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium">
                    <Link
                      href={`/utility/${p}/${post.id}`}
                      className="hover:underline">
                      {post.title}
                    </Link>
                  </h3>
                  {post.status && (
                    <StatusPill status={post.status as IssueStatus} />
                  )}
                </div>
                {post.body && (
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {post.body}
                  </p>
                )}
                <p className="text-[11px] text-zinc-400">
                  {formatDays(post.posted_at)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Facebook individual post embeds — water only */}
        {p === "water" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#1877F2]" aria-hidden="true">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                </svg>
                <p className="text-xs font-semibold text-zinc-700">
                  ЈКП ВИК Прилеп — последни објави
                </p>
              </div>
              <a
                href={FB_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-500 hover:underline">
                Отвори страница →
              </a>
            </div>

            {fbUrls && fbUrls.length > 0 ? (
              <div className="space-y-3">
                {fbUrls.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl overflow-hidden border border-zinc-200 bg-white">
                    <iframe
                      src={`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(row.url)}&show_text=true&width=500&appId=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? ""}`}
                      className="w-full"
                      style={{ height: 250, border: "none", overflow: "hidden" }}
                      scrolling="no"
                      frameBorder="0"
                      allowFullScreen
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">
                Нема додадени објави.{" "}
                <a
                  href={FB_PAGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline">
                  Посетете ја Facebook страницата →
                </a>
              </p>
            )}
          </div>
        )}

        {(!posts || posts.length === 0) && p !== "water" && (
          <p className="text-xs text-zinc-400">Нема тековни соопштенија.</p>
        )}
      </div>
    </Shell>
  );
}
