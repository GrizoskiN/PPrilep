import { createClient } from '../../../lib/supabase/server'
import Shell from '../../../components/layout/Shell'
import IssueDetail from '../../../components/issues/IssueDetail'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function IssueDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: issue } = await supabase
    .from('issues')
    .select(`*, profiles(id, full_name, avatar_url, username)`)
    .eq('id', id)
    .single()

  if (!issue) notFound()

  const [{ count: affectedCount }, { count: helperCount }] = await Promise.all([
    supabase.from('issue_affected').select('*', { count: 'exact', head: true }).eq('issue_id', id),
    supabase.from('issue_helpers').select('*', { count: 'exact', head: true }).eq('issue_id', id),
  ])

  const enriched = { ...issue, affected_count: affectedCount ?? 0, helper_count: helperCount ?? 0 }

  return (
    <Shell>
      <div className="max-w-xl mx-auto py-6 px-4">
        <IssueDetail issue={enriched} />
      </div>
    </Shell>
  )
}
