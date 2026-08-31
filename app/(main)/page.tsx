import Link from "next/link";
import DynamicGreeting from "../../components/home/DynamicGreeting";
import HomeAgencyFeed from "../../components/agency/HomeAgencyFeed";
import { createClient } from "../../lib/supabase/server";
import { DISTRICT_LABELS, STATUS_LABELS, getIssuePath } from "../../lib/utils";
import { STAGE_LABEL } from "../../lib/initiatives";
import { fetchTopHeroes } from "../../lib/data/issues";
import { fetchAllAnnouncements } from "../../lib/sanity/kindergarten";
import { urlForImage } from "../../lib/sanity/image";
import Image from "next/image";
import type { AgencyPost } from "../../lib/types/database";

type HomeIssue = {
  id: number;
  title: string;
  district: string;
  status: string;
  created_at: string;
};

type HomeInitiative = {
  id: string;
  title: string;
  stage: "idea" | "voting" | "funding" | "completed" | "rejected";
  vote_count: number;
  district: string | null;
  created_at: string;
};

export default async function HomePage() {
  const supabase = await createClient();
  // Hide agency posts whose active window hasn't started or has ended.
  const nowIso = new Date().toISOString();

  const [
    { data: authUser },
    { data: issues },
    { data: initiatives },
    heroes,
    { data: agencyPosts },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("issues")
      .select("id, title, district, status, created_at")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("initiatives_with_details")
      .select("id, title, stage, vote_count, district, created_at")
      .order("created_at", { ascending: false })
      .limit(3),
    // Top heroes by real community applause — the applause button writes to
    // issue_resolution_upvotes, summed per resolver. (NOT profiles.points.)
    fetchTopHeroes(supabase, 3),
    supabase
      .from("agency_posts")
      .select("*")
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const user = authUser.user;
  let greetingName = "Прилеп";
  let isAdmin = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    isAdmin = profile?.is_admin === true;

    const rawName =
      profile?.full_name ??
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null) ??
      profile?.username ??
      null;

    if (rawName) greetingName = rawName.trim().split(/\s+/)[0];
  }

  // Live leaderboard: top citizens by real community applause.
  const topHeroes: { count: number; name: string }[] = heroes.map((h) => ({
    name: h.name,
    count: h.points,
  }));

  // Kindergarten announcements (Sanity) — surfaced on the home feed.
  const announcements = (await fetchAllAnnouncements().catch(() => [])).slice(0, 3);

  const latestIssues = (issues as HomeIssue[] | null) ?? [];
  const latestInitiatives = (initiatives as HomeInitiative[] | null) ?? [];
  const posts = (agencyPosts as AgencyPost[] | null) ?? [];

  return (
    <div>
      <div>
        <DynamicGreeting fallbackName={greetingName} />
      </div>
      <div className="mt-6 lg:mt-8">
        <p className="my-3 text-lg leading-8 text-theme-muted">
          Пријави проблеми. Координирај локални акции. Држи ги лидерите
          одговорни.
        </p>
        <HomeAgencyFeed posts={posts} canManage={isAdmin} />

        {announcements.length > 0 && (
          <section className="mb-4 rounded-xl border border-theme bg-theme-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-theme-heading">
                🌸 Градинки — Соопштенија
              </h2>
              <Link
                href="/kindergarten"
                className="text-xs font-semibold text-theme-accent hover:text-primary/80">
                Види повеќе
              </Link>
            </div>
            <div className="space-y-2">
              {announcements.map((a) => {
                const img = a.coverImage ?? a.gallery?.[0] ?? null;
                return (
                  <Link
                    key={a._id}
                    href={`/kindergarten/announcement/${a._id}`}
                    className="flex items-center gap-3 rounded-lg border border-theme bg-theme-surface p-2 hover:border-[#cfe0da]">
                    {img ? (
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={urlForImage(img).width(112).height(112).url()}
                          alt={a.title} fill sizes="56px" className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-2xl">
                        🌸
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-theme-heading">
                        {a.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-theme-muted">
                        {a.isGlobal ? "Сите установи" : a.institutionName}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
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
                    {hero.count} аплаузи
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
              <h2 className="text-sm font-semibold text-theme-heading">
                Иницијативи
              </h2>
              <Link
                href="/initiatives"
                className="text-xs font-semibold text-theme-accent hover:text-primary/80">
                Види повеќе
              </Link>
            </div>
            <div className="space-y-2">
              {latestInitiatives.map((it) => {
                const districtLabel = it.district
                  ? DISTRICT_LABELS[it.district] ?? it.district
                  : null;
                const stageLabel = STAGE_LABEL[it.stage] ?? it.stage;
                return (
                  <Link
                    key={it.id}
                    href={`/initiatives/${it.id}`}
                    className="block rounded-lg border border-theme bg-theme-surface px-3 py-2 hover:border-primary/50">
                    <p className="truncate text-sm font-semibold text-theme-heading">
                      {it.title}
                    </p>
                    <p className="mt-0.5 text-xs text-theme-muted">
                      {stageLabel}
                      {districtLabel ? ` · ${districtLabel}` : ""}
                      {" · "}
                      {it.vote_count} 👏
                    </p>
                  </Link>
                );
              })}
              {latestInitiatives.length === 0 && (
                <p className="text-xs text-theme-subtle">
                  Сè уште нема иницијативи.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
