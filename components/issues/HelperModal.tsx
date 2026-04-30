'use client'

import { useRef, useState } from 'react'
import { X, HandHelping } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import Button from '../ui/Button'
import { toast } from 'sonner'

interface Props {
  issueId: number
  issueTitle: string
  userId: string
  onClose: () => void
  onSuccess: (count: number) => void
}

export default function HelperModal({ issueId, issueTitle, userId, onClose, onSuccess }: Props) {
  const supabase = useRef(createClient()).current
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setLoading(true)
    const { error } = await supabase
      .from('issue_helpers')
      .insert({ issue_id: issueId, user_id: userId, note: note.trim() || null })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const { count } = await supabase
      .from('issue_helpers')
      .select('*', { count: 'exact', head: true })
      .eq('issue_id', issueId)

    toast.success('Се пријавивте да помогнете!')
    onSuccess(count ?? 0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <HandHelping size={16} className="text-teal-600" />
            <h2 className="text-sm font-semibold">Понудете помош</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">
            <p className="text-xs text-zinc-500 mb-0.5">Пријава</p>
            <p className="text-sm font-medium text-zinc-800 line-clamp-2">{issueTitle}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700">
              Опишете како можете да помогнете <span className="text-zinc-400">(незадолжително)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="На пример: Имам опрема за поправка на коловоз и слободно викенд. Може да организираме волонтерска акција..."
              className="mt-1.5 w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none transition-colors"
            />
            <p className="text-[10px] text-zinc-400 text-right mt-0.5">{note.length}/500</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Откажи</Button>
            <Button variant="teal" onClick={submit} disabled={loading}>
              {loading ? 'Се пријавува…' : 'Пријави се'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
