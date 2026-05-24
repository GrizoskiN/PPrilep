import Link from "next/link";
import DynamicGreeting from "../../components/home/DynamicGreeting";
import { createClient } from "../../lib/supabase/server";
import { DISTRICT_LABELS, STATUS_LABELS, getIssuePath } from "../../lib/utils";

type HomeIssue = {
  id: number;
  title: string;
  district: string;
  status: string;
  created_at: string;
};

type HomeCampaign = {
  id: number;
  title: string;
  raised_amount: number;
  goal_amount: number;
  status: string;
};

type HelperProfile = {
  full_name: string | null;
  username: string | null;
};

type HelperRow = {
  user_id: string | null;
  profiles: HelperProfile | HelperProfile[] | null;
};

export default async function HomePage() {
  const supabase = await createClient();

  const [
    { data: authUser },
    { data: issues },
    { data: campaigns },
    { data: helpers },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("issues")
      .select("id, title, district, status, created_at")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("fund_campaigns")
      .select("id, title, raised_amount, goal_amount, status")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("issue_helpers")
      .select("user_id, profiles(full_name, username)"),
  ]);

  const user = authUser.user;
  let greetingName = "Прилеп";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .maybeSingle();

    const rawName =
      profile?.full_name ??
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null) ??
      profile?.username ??
      null;

    if (rawName) greetingName = rawName.trim().split(/\s+/)[0];
  }

  const helperCounts: Record<string, { count: number; name: string }> = {};
  for (const row of (helpers as HelperRow[] | null) ?? []) {
    if (!row.user_id) continue;
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    const displayName = profile?.full_name ?? profile?.username ?? "Анонимно";
    if (!helperCounts[row.user_id]) {
      helperCounts[row.user_id] = { count: 0, name: displayName };
    }
    helperCounts[row.user_id].count += 1;
  }

  const topHeroes = Object.values(helperCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const latestIssues = (issues as HomeIssue[] | null) ?? [];
  const latestCampaigns = (campaigns as HomeCampaign[] | null) ?? [];

  return (
    <div className="mx-auto max-w-theme-page py-4 lg:py-6 lg:px-3">
      <div className="px-3 lg:px-0">
        <DynamicGreeting fallbackName={greetingName} />
      </div>
      <div className="mt-6 px-3 lg:mt-8 lg:px-0">
        <p className="my-3 text-lg leading-8 text-theme-muted">
          Пријави проблеми. Координирај локални акции. Држи ги лидерите
          одговорни.
        </p>
        <div className="  grid gap-4  ">
          <section className="rounded-xl border border-theme bg-theme-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-theme-heading">
                Пријави
              </h2>
              <Link
                href="/issues"
                className="text-xs font-semibold text-theme-accent hover:text-primary/80">
                Види повеќе
              </Link>
            </div>
            <div className="space-y-2">
              {latestIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href={getIssuePath(issue.id, issue.title)}
                  className="block rounded-lg border border-theme bg-theme-surface px-3 py-2 hover:border-[#cfe0da]">
                  <p className="truncate text-sm font-semibold text-theme-heading">
                    {issue.title}
                  </p>
                  <p className="mt-0.5 text-xs text-theme-muted">
                    {DISTRICT_LABELS[issue.district] ?? issue.district} •{" "}
                    {STATUS_LABELS[issue.status] ?? issue.status}
                  </p>
                </Link>
              ))}
              {latestIssues.length === 0 && (
                <p className="text-xs text-theme-subtle">Нема пријави.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-theme bg-theme-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-theme-heading">
                Херои
              </h2>
              <Link
                href="/heroes"
                className="text-xs font-semibold text-theme-accent hover:text-primary/80">
                Види повеќе
              </Link>
            </div>
            <div className="space-y-2">
              {topHeroes.map((hero, idx) => (
                <div
                  key={`${hero.name}-${idx}`}
                  className="rounded-lg border border-theme bg-theme-surface px-3 py-2">
                  <p className="text-sm font-semibold text-theme-heading">
                    {hero.name}
                  </p>
                  <p className="mt-0.5 text-xs text-theme-muted">
                    {hero.count} помагања
                  </p>
                </div>
              ))}
              {topHeroes.length === 0 && (
                <p className="text-xs text-theme-subtle">Сè уште нема херои.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-theme bg-theme-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-theme-heading">Фонд</h2>
              <Link
                href="/fund"
                className="text-xs font-semibold text-theme-accent hover:text-primary/80">
                Види повеќе
              </Link>
            </div>
            <div className="space-y-2">
              {latestCampaigns.map((campaign) => {
                const pct =
                  campaign.goal_amount > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (campaign.raised_amount / campaign.goal_amount) * 100,
                        ),
                      )
                    : 0;
                return (
                  <div
                    key={campaign.id}
                    className="rounded-lg border border-theme bg-theme-surface px-3 py-2">
                    <p className="truncate text-sm font-semibold text-theme-heading">
                      {campaign.title}
                    </p>
                    <p className="mt-0.5 text-xs text-theme-muted">
                      {campaign.raised_amount.toLocaleString()} /{" "}
                      {campaign.goal_amount.toLocaleString()} ден. ({pct}%)
                    </p>
                  </div>
                );
              })}
              {latestCampaigns.length === 0 && (
                <p className="text-xs text-theme-subtle">
                  Нема активни кампањи.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
