'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '../supabase/client'
import type { Issue, District, Category, IssueStatus } from '../types/database'

interface UseIssuesOptions {
  district?: District | 'all'
  category?: Category | 'all'
  status?: IssueStatus | 'all'
}

export function useIssues(opts: UseIssuesOptions = {}) {
  const supabase = useRef(createClient()).current
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchIssues() {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('issues')
      .select(`*, profiles:reported_by(id, full_name, avatar_url, username)`)
      .order('created_at', { ascending: false })

    if (opts.district && opts.district !== 'all') query = query.eq('district', opts.district)
    if (opts.category && opts.category !== 'all') query = query.eq('category', opts.category)
    if (opts.status && opts.status !== 'all') query = query.eq('status', opts.status)

    const { data, error: fetchError } = await query

    if (fetchError) {
      console.error('[useIssues] fetch error:', fetchError)
      setError(fetchError.message)
      setLoading(false)
      return
    }

    if (data) {
      // Fetch counts in parallel — gracefully handle RLS errors for anon users
      const enriched = await Promise.all(data.map(enrichIssue))
      setIssues(enriched)
    }
    setLoading(false)
  }

  async function enrichIssue(issue: Issue): Promise<Issue> {
    const [affected, helpers] = await Promise.all([
      supabase.from('issue_affected').select('*', { count: 'exact', head: true }).eq('issue_id', issue.id),
      supabase.from('issue_helpers').select('*', { count: 'exact', head: true }).eq('issue_id', issue.id),
    ])
    return {
      ...issue,
      affected_count: affected.count ?? 0,
      helper_count: helpers.count ?? 0,
    }
  }

  useEffect(() => {
    fetchIssues()

    const channel = supabase
      .channel('issues-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data } = await supabase
            .from('issues')
            .select(`*, profiles:reported_by(id, full_name, avatar_url, username)`)
            .eq('id', (payload.new as Issue).id)
            .single()
          if (data) {
            const enriched = await enrichIssue(data)
            setIssues(prev => [enriched, ...prev])
          }
        } else if (payload.eventType === 'UPDATE') {
          setIssues(prev =>
            prev.map(i => i.id === (payload.new as Issue).id ? { ...i, ...(payload.new as Issue) } : i)
          )
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.district, opts.category, opts.status])

  return { issues, loading, error, refetch: fetchIssues }
}
