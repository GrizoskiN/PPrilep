import { createClient } from "../../../../lib/supabase/server";
import Link from "next/link";
import StatusPill from "../../../../components/ui/StatusPill";
import BusRouteMap from "../../../../components/ui/BusRouteMap";
import WaterQuickActions from "../../../../components/utility/WaterQuickActions";
import WaterInfoAccordion from "../../../../components/utility/WaterInfoAccordion";
import KomunalecQuickActions from "../../../../components/utility/KomunalecQuickActions";
import KomunalecInfoAccordion from "../../../../components/utility/KomunalecInfoAccordion";
import AgencyChatButtons from "../../../../components/agency/AgencyChatButtons";
import KomunalecContactForm from "../../../../components/komunalec/KomunalecContactForm";
import KomunalecRequestQueue from "../../../../components/komunalec/KomunalecRequestQueue";
import AgencyPostCard from "../../../../components/agency/AgencyPostCard";
import { formatDays } from "../../../../lib/utils";
import type { AgencyId } from "../../../../lib/agencies";
import type {
  Provider,
  IssueStatus,
  AgencyPost,
  District,
} from "../../../../lib/types/database";
import { notFound } from "next/navigation";

// Which institution account owns each utility provider's announcements.
const PROVIDER_AGENCY: Record<Provider, AgencyId> = {
  water: "vodovod",
  garbage: "komunalec",
  power: "osvetluvanje",
  transport: "transport_parking",
  parking: "transport_parking",
  kindergarten: "municipality",
};

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


interface Props {
  params: Promise<{ provider: string }>;
}

export default async function UtilityPage({ params }: Props) {
  const { provider } = await params;
  if (!PROVIDERS.includes(provider as Provider)) notFound();
  const p = provider as Provider;

  const supabase = await createClient();
  const [{ data: authUser }, { data: posts }, { data: agencyPosts }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("utility_posts")
        .select("*")
        .eq("provider", p)
        .order("posted_at", { ascending: false }),
      supabase
        .from("agency_posts")
        .select("*")
        .eq("agency_id", PROVIDER_AGENCY[p])
        .order("created_at", { ascending: false })
        .limit(7),
    ]);

  const agencyList = (agencyPosts as AgencyPost[] | null) ?? [];

  // Admin or this provider's own operator may manage the announcements here.
  let canManage = false;
  let viewer: {
    is_admin?: boolean;
    agency_id?: string | null;
    full_name?: string | null;
    district?: string | null;
    street_name?: string | null;
  } | null = null;
  if (authUser.user) {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin, agency_id, full_name, district, street_name")
      .eq("id", authUser.user.id)
      .maybeSingle();
    viewer = data;
    canManage =
      viewer?.is_admin === true || viewer?.agency_id === PROVIDER_AGENCY[p];
  }

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
            <div className="space-y-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700">
                💬 Контакт и барања
              </h2>
              <AgencyChatButtons agencyId="komunalec" />
              <KomunalecContactForm
                loggedIn={!!authUser.user}
                defaultName={viewer?.full_name ?? undefined}
                defaultDistrict={(viewer?.district as District) ?? undefined}
                defaultStreet={viewer?.street_name ?? undefined}
              />
              {canManage && <KomunalecRequestQueue />}
            </div>
          </>
        )}

        {/* Bus route map — only shown for transport */}
        {p === "transport" && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-700">Линии на градски превоз</h2>
            <BusRouteMap />
          </div>
        )}

        {/* Official announcements from the institution operator account */}
        {agencyList.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700">
              📣 Соопштенија од службата
            </h2>
            <div className="max-h-112 space-y-3 overflow-y-auto pr-1">
              {agencyList.map((post) => (
                <AgencyPostCard key={post.id} post={post} canManage={canManage} />
              ))}
            </div>
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
