import { createClient } from '../../../lib/supabase/server'
import Shell from '../../../components/layout/Shell'
import StatusPill from '../../../components/ui/StatusPill'
import { formatDays } from '../../../lib/utils'
import type { Provider, IssueStatus } from '../../../lib/types/database'
import { notFound } from 'next/navigation'

const PROVIDERS: Provider[] = ['water', 'garbage', 'power']
const PROVIDER_LABELS: Record<Provider, string> = {
  water:   'Водовод',
  garbage: 'Комунален отпад',
  power:   'Електрична енергија',
}
const PROVIDER_ICONS: Record<Provider, string> = { water: '💧', garbage: '🗑️', power: '⚡' }

interface Props {
  params: Promise<{ provider: string }>
}

export default async function UtilityPage({ params }: Props) {
  const { provider } = await params
  if (!PROVIDERS.includes(provider as Provider)) notFound()
  const p = provider as Provider

  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('utility_posts')
    .select('*')
    .eq('provider', p)
    .order('posted_at', { ascending: false })

  return (
    <Shell>
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-base font-semibold">
            {PROVIDER_ICONS[p]} {PROVIDER_LABELS[p]}
          </h1>
          <p className="text-xs text-zinc-500">Официјални соопштенија од комуналното претпријатие</p>
        </div>

        <div className="space-y-3">
          {posts?.map(post => (
            <div key={post.id} className="bg-white border border-zinc-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium">{post.title}</h3>
                {post.status && <StatusPill status={post.status as IssueStatus} />}
              </div>
              {post.body && <p className="text-xs text-zinc-600 leading-relaxed">{post.body}</p>}
              <p className="text-[11px] text-zinc-400">{formatDays(post.posted_at)}</p>
            </div>
          ))}
          {(!posts || posts.length === 0) && (
            <p className="text-xs text-zinc-400">Нема тековни соопштенија.</p>
          )}
        </div>
      </div>
    </Shell>
  )
}
