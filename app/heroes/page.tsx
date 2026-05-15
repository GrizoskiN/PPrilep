import Link from 'next/link'
import { createClient } from '../../lib/supabase/server'
import Shell from '../../components/layout/Shell'
import AvatarInitials from '../../components/ui/AvatarInitials'

interface HeroProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  username: string | null
  points: number
  is_company: boolean
}

function HeroList({ heroes, emptyText }: { heroes: HeroProfile[]; emptyText: string }) {
  if (heroes.length === 0) {
    return <p className="text-xs text-zinc-400">{emptyText}</p>
  }
  return (
    <div className="space-y-2">
      {heroes.map((profile, index) => (
        <Link
          key={profile.id}
          href={profile.username ? `/u/${profile.username}` : `/u/${profile.id}`}

          className="bg-white border border-zinc-200 rounded-lg p-3 flex items-center gap-3 hover:border-zinc-300 hover:bg-zinc-50 transition-colors">
          <span className="text-sm font-bold text-zinc-300 w-6 text-right shrink-0">{index + 1}</span>
          <AvatarInitials name={profile.full_name} avatarUrl={profile.avatar_url} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile.full_name ?? 'Анонимно'}</p>
            {profile.username && <p className="text-xs text-zinc-400">@{profile.username}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold">{profile.points}</p>
            <p className="text-[10px] text-zinc-400">аплаузи</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default async function HeroesPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, username, points, is_company')
    .gt('points', 0)
    .order('points', { ascending: false })
    .limit(40)

  const all = (profiles ?? []) as HeroProfile[]
  const people = all.filter((p) => !p.is_company)
  const companies = all.filter((p) => p.is_company)

  return (
    <Shell>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-base font-semibold">Херои на заедницата!</h1>
          <p className="text-xs text-zinc-500">Граѓани и компании кои помогнале во решавање на проблеми</p>
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">👤</span>
            <h2 className="text-sm font-semibold text-zinc-700">Граѓани</h2>
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
            <h2 className="text-sm font-semibold text-zinc-700">Компании</h2>
            {companies.length > 0 && (
              <span className="ml-auto text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {companies.length}
              </span>
            )}
          </div>
          <HeroList
            heroes={companies}
            emptyText="Сè уште нема компании-херои."
          />
        </section>
      </div>
    </Shell>
  )
}
