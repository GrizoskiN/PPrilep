'use client'

import { useState } from 'react'
import { X, AlertTriangle, HandHelping, Share2, MapPin } from 'lucide-react'
import StatusPill from '../ui/StatusPill'
import AvatarInitials from '../ui/AvatarInitials'
import { formatDays, districtColor, categoryIcon, cn, DISTRICT_LABELS, CATEGORY_LABELS } from '../../lib/utils'
import type { Issue } from '../../lib/types/database'
import { toast } from 'sonner'
import { createClient } from '../../lib/supabase/client'
import dynamic from 'next/dynamic'

const HelperModal = dynamic(() => import('./HelperModal'), { ssr: false })

interface Props {
  issue: Issue
  userId?: string
  onClose?: () => void
}

export default function IssueDetail({ issue, userId, onClose }: Props) {
  const supabase = createClient()
  const [affectedCount, setAffectedCount] = useState(issue.affected_count ?? 0)
  const [helperCount,   setHelperCount]   = useState(issue.helper_count   ?? 0)
  const [isAffected,    setIsAffected]    = useState(issue.is_affected    ?? false)
  const [isHelper,      setIsHelper]      = useState(issue.is_helper      ?? false)
  const [helperOpen,    setHelperOpen]    = useState(false)
  const [loadingAff,    setLoadingAff]    = useState(false)

  function share() {
    navigator.clipboard.writeText(`${location.origin}/issues/${issue.id}`)
    toast.success('Линкот е копиран!')
  }

  async function toggleAffected() {
    if (!userId) { toast.error('Најавете се'); return }
    setLoadingAff(true)
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

  async function removeHelper() {
    if (!userId) return
    await supabase.from('issue_helpers').delete().eq('issue_id', issue.id).eq('user_id', userId)
    const { count } = await supabase.from('issue_helpers').select('*', { count: 'exact', head: true }).eq('issue_id', issue.id)
    setIsHelper(false); setHelperCount(count ?? 0)
    toast.success('Откажано помагање')
  }

  return (
    <>
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-semibold', districtColor(issue.district))}>
              {DISTRICT_LABELS[issue.district] ?? issue.district}
            </span>
            <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-md">
              {categoryIcon(issue.category)} {CATEGORY_LABELS[issue.category] ?? issue.category}
            </span>
            <StatusPill status={issue.status} />
          </div>
          {onClose && (
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 shrink-0 cursor-pointer">
              <X size={14} />
            </button>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold leading-snug">{issue.title}</h2>
          {issue.street_name && (
            <p className="flex items-center gap-1 text-xs text-teal-600 font-medium mt-1">
              <MapPin size={11} /> {issue.street_name}
            </p>
          )}
          {issue.description && (
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{issue.description}</p>
          )}
        </div>

        {issue.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={issue.photo_url} alt="Фотографија" className="w-full rounded-lg object-cover max-h-48 border border-zinc-200" />
        )}

        <div className="flex items-center gap-2">
          {issue.profiles && (
            <AvatarInitials name={issue.profiles.full_name} avatarUrl={issue.profiles.avatar_url} size="sm" />
          )}
          <div className="text-xs text-zinc-500">
            <span>{issue.profiles?.full_name ?? 'Анонимно'}</span>
            <span className="mx-1">·</span>
            <span>{formatDays(issue.created_at)}</span>
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 border-t border-zinc-100 pt-3 flex-wrap">
          <button
            onClick={toggleAffected}
            disabled={loadingAff}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer',
              isAffected
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-zinc-200 text-zinc-600 hover:border-red-200 hover:text-red-600'
            )}
          >
            <AlertTriangle size={12} /> Засегнат/а · {affectedCount}
          </button>

          {isHelper ? (
            <button
              onClick={removeHelper}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-600 cursor-pointer hover:bg-teal-100 transition-colors"
            >
              <HandHelping size={12} /> Помагам · {helperCount}
            </button>
          ) : (
            <button
              onClick={() => { if (!userId) { toast.error('Најавете се'); return }; setHelperOpen(true) }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:border-teal-300 hover:text-teal-600 cursor-pointer transition-colors"
            >
              <HandHelping size={12} /> Помагам · {helperCount}
            </button>
          )}

          <button onClick={share} className="ml-auto text-zinc-400 hover:text-teal-600 transition-colors cursor-pointer">
            <Share2 size={13} />
          </button>
        </div>
      </div>

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
