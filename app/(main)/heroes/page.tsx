import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import AvatarInitials, { type MembershipTier } from "../../../components/ui/AvatarInitials";

interface HeroProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  points: number;
  is_company: boolean;
  membership_tier: string | null;
}

function HeroList({
  heroes,
  emptyText,
}: {
  heroes: HeroProfile[];
  emptyText: string;
}) {
  if (heroes.length === 0) {
    return <p className="text-xs text-theme-subtle">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      {heroes.map((profile, index) => (
        <Link
          key={profile.id}
          href={
            profile.username ? `/u/${profile.username}` : `/u/${profile.id}`
          }
          className="bg-theme-surface border border-theme rounded-lg p-4 flex items-center gap-3 hover:border-zinc-300 hover:bg-zinc-50 transition-colors">
          <span className="text-sm font-bold text-theme-subtle w-6 text-right shrink-0">
            {index + 1}
          </span>
          <AvatarInitials
            name={profile.full_name}
            avatarUrl={profile.avatar_url}
            size="md"
            membershipTier={profile.membership_tier as MembershipTier}
            points={profile.points}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-theme-heading">
              {profile.full_name ?? "Анонимно"}
            </p>
            {profile.username && (
              <p className="text-xs text-theme-subtle">@{profile.username}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-theme-heading">
              {profile.points}
            </p>
            <p className="text-[10px] text-theme-subtle">аплаузи</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function HeroesPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, username, points, is_company, membership_tier")
    .gt("points", 0)
    .order("points", { ascending: false })
    .limit(40);

  const all = (profiles ?? []) as HeroProfile[];
  const people = all.filter((p) => !p.is_company);
  const companies = all.filter((p) => p.is_company);

  return (
    <div className="px-4 py-4 space-y-6">
      <div>
        <h1 className="text-base font-semibold text-theme-heading">
          Херои на заедницата!
        </h1>
        <p className="text-xs text-theme-muted">
          Граѓани и компании кои помогнале во решавање на проблеми
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">👤</span>
          <h2 className="text-sm font-semibold text-theme-heading">Граѓани</h2>
          {people.length > 0 && (
            <span className="ml-auto text-xs font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
              {people.length}
            </span>
          )}
        </div>
        <HeroList
          heroes={people}
          emptyText="Сè уште нема херои-граѓани. Бидете први да помогнете!"
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🏢</span>
          <h2 className="text-sm font-semibold text-theme-heading">Компании</h2>
          {companies.length > 0 && (
            <span className="ml-auto text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              {companies.length}
            </span>
          )}
        </div>
        <HeroList heroes={companies} emptyText="Сè уште нема компании-херои." />
      </section>
    </div>
  );
}
