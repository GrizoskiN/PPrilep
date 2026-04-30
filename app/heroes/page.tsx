import { createClient } from '../../lib/supabase/server'
import Shell from '../../components/layout/Shell'
import AvatarInitials from '../../components/ui/AvatarInitials'

export default async function HeroesPage() {
  const supabase = await createClient()

  const { data: helpers } = await supabase
    .from('issue_helpers')
    .select('user_id, profiles(full_name, avatar_url, username, points)')

  const counts: Record<string, { count: number; profile: { full_name: string | null; avatar_url: string | null; username: string | null; points: number } }> = {}
  for (const h of helpers ?? []) {
    if (!h.user_id) continue
    const p = Array.isArray(h.profiles) ? h.profiles[0] : h.profiles
    if (!p) continue
    if (!counts[h.user_id]) counts[h.user_id] = { count: 0, profile: p as { full_name: string | null; avatar_url: string | null; username: string | null; points: number } }
    counts[h.user_id].count++
  }

  const heroes = Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)

  return (
    <Shell>
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-base font-semibold">Херои на заедницата</h1>
          <p className="text-xs text-zinc-500">Граѓани кои се пријавија да помогнат во решавање на проблеми</p>
        </div>

        <div className="space-y-2">
          {heroes.map(([userId, { count, profile }], index) => (
            <div key={userId} className="bg-white border border-zinc-200 rounded-lg p-3 flex items-center gap-3">
              <span className="text-sm font-bold text-zinc-300 w-6 text-right">{index + 1}</span>
              <AvatarInitials name={profile.full_name} avatarUrl={profile.avatar_url} size="md" />
              <div className="flex-1">
                <p className="text-sm font-medium">{profile.full_name ?? 'Анонимно'}</p>
                {profile.username && <p className="text-xs text-zinc-400">@{profile.username}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{count}</p>
                <p className="text-[10px] text-zinc-400">помагања</p>
              </div>
            </div>
          ))}
          {heroes.length === 0 && (
            <p className="text-xs text-zinc-400">Сè уште нема херои. Бидете први да помогнете!</p>
          )}
        </div>
      </div>
    </Shell>
  )
}
