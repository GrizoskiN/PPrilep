'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import Link from 'next/link'
import PromiseTracker from '../ui/PromiseTracker'

interface Stats {
  open: number
  progress: number
  resolved: number
  total: number
}

export default function RightPanel() {
  const supabase = useRef(createClient()).current
  const [stats, setStats] = useState<Stats>({ open: 0, progress: 0, resolved: 0, total: 0 })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('issues').select('status')
      if (!data) return
      const open     = data.filter(i => i.status === 'open').length
      const progress = data.filter(i => i.status === 'progress').length
      const resolved = data.filter(i => i.status === 'resolved').length
      setStats({ open, progress, resolved, total: data.length })
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <aside className="overflow-y-auto border-l border-zinc-200 py-4 px-3 bg-white flex flex-col gap-4">
      {/* Promise Tracker — always at the top */}
      <PromiseTracker />

      <section>
        <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Статистика</h3>
        <div className="space-y-2">
          <StatRow label="Вкупно пријави"  value={stats.total}    />
          <StatRow label="Отворени"         value={stats.open}     accent="text-red-600" />
          <StatRow label="Во тек"           value={stats.progress} accent="text-amber-600" />
          <StatRow label="Решени"           value={stats.resolved} accent="text-teal-600" />
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Брзи врски</h3>
        <div className="flex flex-col gap-1">
          <Link href="/fund"          className="text-sm text-zinc-700 hover:text-teal-600 transition-colors cursor-pointer">→ Фонд кампањи</Link>
          <Link href="/ideas"         className="text-sm text-zinc-700 hover:text-teal-600 transition-colors cursor-pointer">→ Идеи на граѓани</Link>
          <Link href="/heroes"        className="text-sm text-zinc-700 hover:text-teal-600 transition-colors cursor-pointer">→ Херои на заедницата</Link>
          <Link href="/utility/water" className="text-sm text-zinc-700 hover:text-teal-600 transition-colors cursor-pointer">→ Водовод известувања</Link>
        </div>
      </section>

      <section className="mt-auto">
        <div className="border border-zinc-200 rounded-xl p-3 text-xs text-zinc-500 bg-zinc-50">
          <p className="font-semibold text-zinc-700 mb-1">За Подобар Прилеп</p>
          <p>Граѓанска платформа за пријавување и решавање на градски проблеми во Прилеп.</p>
        </div>
      </section>
    </aside>
  )
}

function StatRow({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-bold tabular-nums ${accent ?? 'text-zinc-800'}`}>{value}</span>
    </div>
  )
}
