'use client'

import { useRef } from 'react'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '../../lib/supabase/client'
import Button from '../ui/Button'
import { toast } from 'sonner'

const schema = z.object({
  title: z.string().min(5, 'Барем 5 знаци'),
  body:  z.string().optional(),
})
type Fields = z.infer<typeof schema>

interface Props {
  userId: string
  onClose: () => void
  onSuccess: () => void
}

export default function NewIdeaModal({ userId, onClose, onSuccess }: Props) {
  const supabase = useRef(createClient()).current
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: Fields) {
    const { error } = await supabase.from('ideas').insert({ ...values, created_by: userId })
    if (error) { toast.error(error.message); return }
    toast.success('Идејата е поднесена!')
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <h2 className="text-sm font-semibold">Споделете идеја</h2>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-700">Наслов *</label>
            <input {...register('title')} className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-black" />
            {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Детали</label>
            <textarea {...register('body')} rows={4} className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-black resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Откажи</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Се испраќа…' : 'Поднеси'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
