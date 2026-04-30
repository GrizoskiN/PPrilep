'use client'

import { useState } from 'react'
import { Share2, AlertTriangle, HandHelping, MapPin } from 'lucide-react'
import StatusPill from '../ui/StatusPill'
import AvatarInitials from '../ui/AvatarInitials'
import { formatDays, dayCount, districtColor, categoryIcon, cn, DISTRICT_LABELS, CATEGORY_LABELS } from '../../lib/utils'
import type { Issue } from '../../lib/types/database'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const HelperModal = dynamic(() => import('./HelperModal'), { ssr: false })

interface Props {
  issue: Issue
  userId?: string
  onClick?: () => void
  selected?: boolean
  onAffectedToggle?: (affected: boolean, count: number) => void
}

export default function IssueCard({ issue, userId, onClick, selected, onAffectedToggle }: Props) {
  const [affectedCount, setAffectedCount] = useState(issue.affected_count ?? 0)
  const [helperCount,   setHelperCount]   = useState(issue.helper_count   ?? 0)
  const [isAffected,    setIsAffected]    = useState(issue.is_affected    ?? false)
  const [isHelper,      setIsHelper]      = useState(issue.is_helper      ?? false)
  const [helperOpen,    setHelperOpen]    = useState(false)
  const [loadingAff,    setLoadingAff]    = useState(false)

  const days     = dayCount(issue.created_at)
  const isUrgent = days >= 7 && issue.status !== 'resolved'

  function share(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(`${location.origin}/issues/${issue.id}`)
    toast.success('Линкот е копиран!')
  }

  async function toggleAffected(e: React.MouseEvent) {
    e.stopPropagation()
    if (!userId) { toast.error('Најавете се за да се означите како засегнати'); return }
    if (loadingAff) return
    setLoadingAff(true)
    const { createClient } = await import('../../lib/supabase/client')
    const supabase = createClient()
    if (isAffected) {
      await supabase.from('issue_affected').delete().eq('issue_id', issue.id).eq('user_id', userId)
      const { count } = await supabase.from('issue_affected').select('*', { count: 'exact', head: true }).eq('issue_id', issue.id)
      setIsAffected(false); setAffectedCount(count ?? 0)
    } else {
      await supabase.from('issue_affected').insert({ issue_id: issue.id, user_id: userId })
      const { count } = await supabase.from('issue_affected').select('*', { count: 'exact', head: true }).eq('issue_id', issue.id)
      setIsAffected(true); setAffectedCount(count ?? 0)
      toast.success('Означени сте како засегнати')
    }
    setLoadingAff(false)
  }

  function openHelper(e: React.MouseEvent) {
    e.stopPropagation()
    if (!userId) { toast.error('Најавете се за да понудите помош'); return }
    if (isHelper) return // already helping — detail view handles removal
    setHelperOpen(true)
  }

  return (
    <>
      <article
        onClick={onClick}
        className={cn(
          'bg-white border border-zinc-200 rounded-xl p-4 cursor-pointer hover:border-zinc-300 hover:shadow-sm transition-all',
          selected && 'border-teal-500 ring-1 ring-teal-500'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-semibold', districtColor(issue.district))}>
              {DISTRICT_LABELS[issue.district] ?? issue.district}
            </span>
            <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-md">
              {categoryIcon(issue.category)} {CATEGORY_LABELS[issue.category] ?? issue.category}
            </span>
            <StatusPill status={issue.status} />
          </div>
          <button onClick={share} className="text-zinc-400 hover:text-zinc-700 shrink-0 cursor-pointer">
            <Share2 size={13} />
          </button>
        </div>

        <h3 className="text-sm font-semibold leading-snug mb-0.5 line-clamp-2">{issue.title}</h3>

        {issue.street_name && (
          <p className="flex items-center gap-1 text-[11px] text-teal-600 font-medium mb-1">
            <MapPin size={10} /> {issue.street_name}
          </p>
        )}

        {issue.description && (
          <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{issue.description}</p>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-50">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAffected}
              disabled={loadingAff}
              className={cn(
                'flex items-center gap-1 text-xs rounded-lg px-2 py-1 transition-colors cursor-pointer',
                isAffected ? 'bg-red-50 text-red-600 border border-red-200' : 'text-zinc-500 hover:bg-red-50 hover:text-red-600'
              )}
            >
              <AlertTriangle size={11} /> {affectedCount}
            </button>
            <button
              onClick={openHelper}
              className={cn(
                'flex items-center gap-1 text-xs rounded-lg px-2 py-1 transition-colors cursor-pointer',
                isHelper ? 'bg-teal-50 text-teal-600 border border-teal-200' : 'text-zinc-500 hover:bg-teal-50 hover:text-teal-600'
              )}
            >
              <HandHelping size={11} /> {helperCount}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {issue.profiles && (
              <AvatarInitials name={issue.profiles.full_name} avatarUrl={issue.profiles.avatar_url} size="sm" />
            )}
            <span className={cn('text-[11px]', isUrgent ? 'text-red-700 font-bold' : 'text-zinc-400')}>
              {formatDays(issue.created_at)}
            </span>
          </div>
        </div>
      </article>

      {helperOpen && userId && (
        <HelperModal
          issueId={issue.id}
          issueTitle={issue.title}
          userId={userId}
          onClose={() => setHelperOpen(false)}
          onSuccess={(count) => { setIsHelper(true); setHelperCount(count); setHelperOpen(false) }}
        />
      )}
    </>
  )
}
