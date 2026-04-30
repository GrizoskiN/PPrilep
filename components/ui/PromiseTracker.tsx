'use client'

import { Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'

interface Promise {
  id: number
  title: string
  deadline: string
  status: 'on_track' | 'delayed' | 'completed'
  daysInfo: string
}

// Dummy data — replace with DB table when ready
const PROMISES: Promise[] = [
  { id: 1, title: 'Точила — паркинг осветлување',    deadline: '15 апр',  status: 'delayed',   daysInfo: '15 дена задоцнување' },
  { id: 2, title: 'Поправка коловоз — Центар',        deadline: '30 мај',  status: 'on_track',  daysInfo: 'Рок: 30 мај' },
  { id: 3, title: 'Детско игралиште — Три Бари',      deadline: '15 јун',  status: 'on_track',  daysInfo: 'Рок: 15 јун' },
  { id: 4, title: 'Канализација — Варош ул. Бигор',   deadline: '1 апр',   status: 'completed', daysInfo: 'Завршено' },
]

const CONFIG = {
  on_track:  { label: 'ВО РОК',   icon: Clock,         badge: 'bg-amber-100 text-amber-700 border border-amber-300',  bar: 'bg-amber-400' },
  delayed:   { label: 'ЗАДОЦНЕТ', icon: AlertCircle,    badge: 'bg-red-100 text-red-700 border border-red-300',        bar: 'bg-red-500'   },
  completed: { label: 'ГОТОВО',   icon: CheckCircle2,   badge: 'bg-teal-100 text-teal-700 border border-teal-300',     bar: 'bg-teal-500'  },
}

export default function PromiseTracker() {
  const active = PROMISES.filter(p => p.status !== 'completed')
  const done   = PROMISES.filter(p => p.status === 'completed')

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900 text-white">
        <CheckCircle2 size={13} className="text-teal-400" />
        <h3 className="text-xs font-bold tracking-wide uppercase">Ветувања на општина</h3>
        <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
          {PROMISES.filter(p => p.status === 'delayed').length} задоцн.
        </span>
      </div>

      <div className="divide-y divide-zinc-100">
        {active.map(p => {
          const cfg = CONFIG[p.status]
          const Icon = cfg.icon
          return (
            <div key={p.id} className="px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-zinc-50 cursor-pointer transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-800 leading-snug truncate">{p.title}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
                  <Icon size={10} />
                  {p.daysInfo}
                </p>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
          )
        })}
      </div>

      {done.length > 0 && (
        <div className="border-t border-zinc-100 bg-zinc-50">
          {done.map(p => (
            <div key={p.id} className="px-3 py-2 flex items-center gap-2 opacity-60">
              <CheckCircle2 size={11} className="text-teal-500 shrink-0" />
              <p className="text-[11px] text-zinc-500 line-through flex-1 truncate">{p.title}</p>
              <span className="text-[9px] text-teal-600 font-semibold shrink-0">✓</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-zinc-100 px-3 py-2">
        <button className="w-full flex items-center justify-center gap-1 text-[11px] text-zinc-500 hover:text-teal-600 transition-colors cursor-pointer">
          Прегледај ги сите ветувања <ChevronRight size={11} />
        </button>
      </div>
    </div>
  )
}
