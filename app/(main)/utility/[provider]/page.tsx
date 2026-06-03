import { createClient } from "../../../../lib/supabase/server";
import Link from "next/link";
import StatusPill from "../../../../components/ui/StatusPill";
import BusRouteMap from "../../../../components/ui/BusRouteMap";
import WaterQuickActions from "../../../../components/utility/WaterQuickActions";
import WaterInfoAccordion from "../../../../components/utility/WaterInfoAccordion";
import KomunalecQuickActions from "../../../../components/utility/KomunalecQuickActions";
import KomunalecInfoAccordion from "../../../../components/utility/KomunalecInfoAccordion";
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
        </div>

        {/* Water quick actions — pay bill + emergency contacts */}
        {p === "water" && (
          <>
            <WaterQuickActions />
            <WaterInfoAccordion />
          </>
        )}

        {/* Komunalec quick actions */}
        {p === "garbage" && (
          <>
            <KomunalecQuickActions />
            <KomunalecInfoAccordion />
          </>
        )}

        {/* Bus route map — only shown for transport */}
        {p === "transport" && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-700">Линии на градски превоз</h2>
            <BusRouteMap />
          </div>
        )}

        {/* Posts feed — hidden for providers with rich custom UI */}
        <div className={`space-y-3${p === "water" || p === "garbage" ? " hidden" : ""}`}>
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
