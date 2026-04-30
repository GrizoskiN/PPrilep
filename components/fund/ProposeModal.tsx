'use client'

import { useRef } from 'react'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '../../lib/supabase/client'
import Button from '../ui/Button'
import { toast } from 'sonner'

const DISTRICTS = ['Center', 'Varoš', 'Trizla', 'Točila', 'Rid', 'Tri Bari'] as const
const DISTRICT_MK: Record<string, string> = {
  Center: 'Центар', Varoš: 'Варош', Trizla: 'Тризла',
  Točila: 'Точила', Rid: 'Рид', 'Tri Bari': 'Три Бари',
}

const schema = z.object({
  title:       z.string().min(5, 'Барем 5 знаци'),
  description: z.string().optional(),
  district:    z.enum(DISTRICTS).optional(),
  goal_amount: z.number().min(1000, 'Минимум 1.000 ден'),
})
type Fields = z.infer<typeof schema>

interface Props {
  userId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ProposeModal({ userId, onClose, onSuccess }: Props) {
  const supabase = useRef(createClient()).current
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { goal_amount: 10000 },
  })

  async function onSubmit(values: Fields) {
    const { error } = await supabase.from('fund_campaigns').insert({ ...values, created_by: userId })
    if (error) { toast.error(error.message); return }
    toast.success('Кампањата е предложена!')
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <h2 className="text-sm font-semibold">Предложи фонд кампања</h2>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-700">Наслов *</label>
            <input {...register('title')} className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-black" />
            {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Опис</label>
            <textarea {...register('description')} rows={3} className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-black resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-700">Населба</label>
              <select {...register('district')} className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm bg-white">
                <option value="">Целиот град</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{DISTRICT_MK[d]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-700">Цел (ден.) *</label>
              <input {...register('goal_amount', { valueAsNumber: true })} type="number" className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-black" />
              {errors.goal_amount && <p className="text-[11px] text-red-500 mt-1">{errors.goal_amount.message}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Откажи</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Се испраќа…' : 'Предложи'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
