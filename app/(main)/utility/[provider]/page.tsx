import { createClient } from "../../../../lib/supabase/server";
import Link from "next/link";
import StatusPill from "../../../../components/ui/StatusPill";
import BusRouteMap from "../../../../components/ui/BusRouteMap";
import { formatDays } from "../../../../lib/utils";
import type { Provider, IssueStatus } from "../../../../lib/types/database";
import { notFound } from "next/navigation";

const PROVIDERS: Provider[] = [
  "water",
  "garbage",
  "power",
  "transport",
  "parking",
];
const PROVIDER_LABELS: Record<Provider, string> = {
  water: "Водовод",
  garbage: "Комуналец",
  power: "Осветлување",
  transport: "Градски превоз",
  parking: "Паркинзи",
  kindergarten: "Градинки — Наша Иднина",
};
const PROVIDER_ICONS: Record<Provider, string> = {
  water: "💧",
  garbage: "🗑️",
  power: "💡",
  transport: "🚌",
  parking: "🅿️",
  kindergarten: "🌸",
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
  const { data: posts } = await supabase
    .from("utility_posts")
    .select("*")
    .eq("provider", p)
    .order("posted_at", { ascending: false });

  return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-base font-semibold">
              {PROVIDER_ICONS[p]} {PROVIDER_LABELS[p]}
            </h1>
            <p className="text-xs text-zinc-500">
              Официјални соопштенија од комуналното претпријатие
            </p>
          </div>
          {p === "water" && (
            <a
              href={FB_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-blue-500 hover:underline shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-3 h-3 fill-[#1877F2]"
                aria-hidden="true">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
              </svg>
              Facebook страница
            </a>
          )}
        </div>

        {/* Bus route map — only shown for transport */}
        {p === "transport" && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-700">Линии на градски превоз</h2>
            <BusRouteMap />
          </div>
        )}

        <div className="space-y-3">
          {posts && posts.length > 0 ? (
            posts.map((post) => (
              <div
                key={post.id}
                className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2 shadow-sm">
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
                {post.source_url && (
                  <a
                    href={post.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
                    Facebook линк
                  </a>
                )}
                <p className="text-[11px] text-zinc-400">
                  {formatDays(post.posted_at)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-400">Нема тековни соопштенија.</p>
          )}
        </div>
      </div>
  );
}
