import { createClient } from "../../../../lib/supabase/server";
import Link from "next/link";
import StatusPill from "../../../../components/ui/StatusPill";
import BusRouteMap from "../../../../components/ui/BusRouteMap";
import BusLineManager from "../../../../components/transport/BusLineManager";
import WaterQuickActions from "../../../../components/utility/WaterQuickActions";
import WaterInfoAccordion from "../../../../components/utility/WaterInfoAccordion";
import KomunalecQuickActions from "../../../../components/utility/KomunalecQuickActions";
import KomunalecInfoAccordion from "../../../../components/utility/KomunalecInfoAccordion";
import KomunalecContactForm from "../../../../components/komunalec/KomunalecContactForm";
import KomunalecRequestQueue from "../../../../components/komunalec/KomunalecRequestQueue";
import AgencyPostCard from "../../../../components/agency/AgencyPostCard";
import { formatDays } from "../../../../lib/utils";
import type { AgencyId } from "../../../../lib/agencies";
import type {
  Provider,
  IssueStatus,
  AgencyPost,
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
// Who actually publishes here. This was one hardcoded line reading "комуналното
// претпријатие" for every provider, which is wrong for most of them — паркинзите
// are run by ЈП за ПУП, not by Комуналец.
const PROVIDER_SUBTITLES: Record<Provider, string> = {
  water: "Официјални соопштенија од ЈКП „Водовод и канализација“ Прилеп",
  garbage: "Официјални соопштенија од ЈКП „Комуналец“ Прилеп",
  power: "Официјални соопштенија од надлежната служба за улично осветлување",
  transport: "Официјални соопштенија за градскиот превоз",
  parking: "Официјални соопштенија од ЈП за ПУП Прилеп",
  kindergarten: "Официјални соопштенија од градинките во Прилеп",
};


interface Props {
  params: Promise<{ provider: string }>;
}

export async function generateMetadata({
  params,
}: Props): Promise<import("next").Metadata> {
  const { provider } = await params;
  if (!PROVIDERS.includes(provider as Provider)) return {};
  const p = provider as Provider;
  // Transport is served at the pretty /prevoz URL — point the canonical there so
  // the rewrite source (/utility/transport) isn't indexed as a duplicate.
  const canonical = p === "transport" ? "/prevoz" : `/utility/${p}`;
  return {
    title: `${PROVIDER_LABELS[p]} — Мој Прилеп`,
    description:
      p === "transport"
        ? "Автобусите во градскиот превоз во Прилеп во живо на мапа — линии, стојки и тековни соопштенија."
        : `Официјални соопштенија и информации од ${PROVIDER_LABELS[p]} во Прилеп.`,
    alternates: { canonical },
  };
}

export default async function UtilityPage({ params }: Props) {
  const { provider } = await params;
  if (!PROVIDERS.includes(provider as Provider)) notFound();
  const p = provider as Provider;

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
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
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
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
        {/* Transport (the live bus map) speaks for itself — no heading needed. */}
        {p !== "transport" && (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-base font-semibold">
                {PROVIDER_ICONS[p]} {PROVIDER_LABELS[p]}
              </h1>
              <p className="text-xs text-zinc-500">{PROVIDER_SUBTITLES[p]}</p>
            </div>
          </div>
        )}

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
            <Link
              href="/recycle"
              className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 transition-colors hover:bg-blue-100">
              <span className="text-2xl">♻️</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-blue-900">
                  Рециклирање на стакло
                </span>
                <span className="block text-xs text-blue-700">
                  Мапа со сите локации на контејнери за стаклена амбалажа
                </span>
              </span>
              <span className="text-blue-400">→</span>
            </Link>
            <KomunalecInfoAccordion />
            <div className="space-y-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700">
                💬 Контакт и барања
              </h2>
              <KomunalecContactForm
                loggedIn={!!authUser.user}
                defaultName={viewer?.full_name ?? undefined}
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
            {canManage && <BusLineManager />}
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
