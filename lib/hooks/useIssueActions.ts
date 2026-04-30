'use client'

import { useRef, useState } from 'react'
import { createClient } from '../supabase/client'
import { toast } from 'sonner'

export function useIssueActions(issueId: number, userId: string | undefined) {
  const supabase = useRef(createClient()).current
  const [loadingAffected, setLoadingAffected] = useState(false)
  const [loadingHelper, setLoadingHelper] = useState(false)

  async function toggleAffected(currentlyAffected: boolean, onUpdate: (affected: boolean, count: number) => void) {
    if (!userId) { toast.error('Најавете се за да се означите како засегнати'); return }
    setLoadingAffected(true)
    try {
      if (currentlyAffected) {
        await supabase.from('issue_affected').delete().eq('issue_id', issueId).eq('user_id', userId)
        const { count } = await supabase.from('issue_affected').select('*', { count: 'exact', head: true }).eq('issue_id', issueId)
        onUpdate(false, count ?? 0)
      } else {
        await supabase.from('issue_affected').insert({ issue_id: issueId, user_id: userId })
        const { count } = await supabase.from('issue_affected').select('*', { count: 'exact', head: true }).eq('issue_id', issueId)
        onUpdate(true, count ?? 0)
        toast.success('Означени сте како засегнати')
      }
    } catch {
      toast.error('Настана грешка')
    } finally {
      setLoadingAffected(false)
    }
  }

  async function toggleHelper(currentlyHelper: boolean, onUpdate: (helper: boolean, count: number) => void) {
    if (!userId) { toast.error('Најавете се за да понудите помош'); return }
    setLoadingHelper(true)
    try {
      if (currentlyHelper) {
        await supabase.from('issue_helpers').delete().eq('issue_id', issueId).eq('user_id', userId)
        const { count } = await supabase.from('issue_helpers').select('*', { count: 'exact', head: true }).eq('issue_id', issueId)
        onUpdate(false, count ?? 0)
      } else {
        await supabase.from('issue_helpers').insert({ issue_id: issueId, user_id: userId })
        const { count } = await supabase.from('issue_helpers').select('*', { count: 'exact', head: true }).eq('issue_id', issueId)
        onUpdate(true, count ?? 0)
        toast.success('Се пријавивте да помогнете!')
      }
    } catch {
      toast.error('Настана грешка')
    } finally {
      setLoadingHelper(false)
    }
  }

  return { toggleAffected, toggleHelper, loadingAffected, loadingHelper }
}
