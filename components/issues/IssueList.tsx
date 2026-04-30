'use client'

import { useState } from 'react'
import { useIssues } from '../../lib/hooks/useIssues'
import { useAuth } from '../../lib/hooks/useAuth'
import IssueCard from './IssueCard'
import IssueDetail from './IssueDetail'
import { DISTRICT_LABELS, CATEGORY_LABELS, STATUS_LABELS } from '../../lib/utils'
import type { District, Category, IssueStatus, Issue } from '../../lib/types/database'

// 'all' maps to no filter (entire city = Прилеп)
const DISTRICTS: Array<District | 'all'> = ['all', 'Center', 'Varoš', 'Trizla', 'Točila', 'Rid', 'Tri Bari']
const CATEGORIES: Array<Category | 'all'> = ['all', 'road', 'water', 'power', 'garbage', 'park', 'other']
const STATUSES: Array<IssueStatus | 'all'> = ['all', 'open', 'progress', 'resolved']

const CATEGORY_ALL_LABEL = 'Сите категории'
const STATUS_ALL_LABEL   = 'Сите статуси'

export default function IssueList({ defaultDistrict }: { defaultDistrict?: District }) {
  const [district, setDistrict] = useState<District | 'all'>(defaultDistrict ?? 'all')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [status,   setStatus]   = useState<IssueStatus | 'all'>('all')
  const [selected, setSelected] = useState<Issue | null>(null)

  const { issues, loading, error } = useIssues({ district, category, status })
  const { user } = useAuth()

  return (
    <div className="flex gap-0 h-full">
      <div className="flex-1 overflow-y-auto">
        {/* Filters */}
        <div className="sticky top-0 bg-zinc-50 z-10 px-4 pt-4 pb-2 border-b border-zinc-200">
          <div className="flex flex-wrap gap-2">
            {/* District: first option is "Прилеп" = all */}
            <select
              value={district}
              onChange={e => setDistrict(e.target.value as District | 'all')}
              className="text-xs border border-zinc-200 rounded px-2 py-1 bg-white"
            >
              {DISTRICTS.map(d => (
                <option key={d} value={d}>
                  {DISTRICT_LABELS[d] ?? d}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={e => setCategory(e.target.value as Category | 'all')}
              className="text-xs border border-zinc-200 rounded px-2 py-1 bg-white"
            >
              <option value="all">{CATEGORY_ALL_LABEL}</option>
              {(CATEGORIES.filter(c => c !== 'all') as Category[]).map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={e => setStatus(e.target.value as IssueStatus | 'all')}
              className="text-xs border border-zinc-200 rounded px-2 py-1 bg-white"
            >
              <option value="all">{STATUS_ALL_LABEL}</option>
              {(STATUSES.filter(s => s !== 'all') as IssueStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loading && <p className="text-xs text-zinc-400">Се вчитуваат пријави…</p>}
          {error && (
            <div className="text-xs text-red-600 border border-red-200 rounded p-3 bg-red-50">
              <p className="font-medium">Грешка при вчитување</p>
              <p className="text-red-500 mt-0.5">{error}</p>
            </div>
          )}
          {!loading && !error && issues.length === 0 && (
            <p className="text-xs text-zinc-400">Нема пријавени проблеми.</p>
          )}
          {issues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              userId={user?.id}
              selected={selected?.id === issue.id}
              onClick={() => setSelected(selected?.id === issue.id ? null : issue)}
            />
          ))}
        </div>
      </div>

      {selected && (
        <div className="w-80 border-l border-zinc-200 overflow-y-auto hidden lg:block">
          <IssueDetail issue={selected} userId={user?.id} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  )
}
