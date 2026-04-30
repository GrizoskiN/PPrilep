import { cn } from '../../lib/utils'
import type { IssueStatus } from '../../lib/types/database'

const labels: Record<IssueStatus, string> = {
  open:     'Отворено',
  progress: 'Во тек',
  resolved: 'Решено',
}

export default function StatusPill({ status }: { status: IssueStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        status === 'resolved' && 'bg-teal-600 text-white',
        status === 'open'     && 'bg-red-50 border border-red-300 text-red-600',
        status === 'progress' && 'bg-amber-50 border border-amber-300 text-amber-700'
      )}
    >
      {labels[status]}
    </span>
  )
}
