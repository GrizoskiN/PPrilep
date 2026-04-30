import { createClient } from '../../lib/supabase/server'
import Shell from '../../components/layout/Shell'
import { DISTRICT_LABELS } from '../../lib/utils'
import type { District } from '../../lib/types/database'

const districts: District[] = ['Center', 'Varoš', 'Trizla', 'Točila', 'Rid', 'Tri Bari']

export default async function CommunitiesPage() {
  const supabase = await createClient()
  const { data: issues } = await supabase.from('issues').select('district, status')

  const stats = districts.map(d => {
    const dIssues = issues?.filter(i => i.district === d) ?? []
    return {
      district: d,
      label: DISTRICT_LABELS[d] ?? d,
      total:    dIssues.length,
      open:     dIssues.filter(i => i.status === 'open').length,
      resolved: dIssues.filter(i => i.status === 'resolved').length,
    }
  })

  return (
    <Shell>
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-base font-semibold">Населби</h1>
          <p className="text-xs text-zinc-500">Статистика по населби</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stats.map(s => (
            <div key={s.district} className="bg-white border border-zinc-200 rounded-lg p-4 space-y-2">
              <h2 className="text-sm font-semibold">{s.label}</h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{s.total}</p>
                  <p className="text-[10px] text-zinc-400 uppercase">Вкупно</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{s.open}</p>
                  <p className="text-[10px] text-zinc-400 uppercase">Отворени</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{s.resolved}</p>
                  <p className="text-[10px] text-zinc-400 uppercase">Решени</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}
