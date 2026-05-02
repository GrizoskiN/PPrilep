'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '../../../lib/supabase/client'
import Button from '../../../components/ui/Button'
import { toast } from 'sonner'
import { useRef, useState } from 'react'

const schema = z.object({
  full_name: z.string().min(2, 'Внесете го вашето целосно име'),
  email:     z.string().email('Внесете валидна е-пошта'),
  password:  z.string().min(6, 'Барем 6 знаци'),
})
type Fields = z.infer<typeof schema>

export default function RegisterPage() {
  const supabase = useRef(createClient()).current
  const [done, setDone] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: Fields) {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.full_name } },
    })
    if (error) { toast.error(error.message); return }
    setDone(true)
  }

  async function signUpWithGoogle() {
    setOauthLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
    if (error) {
      setOauthLoading(false)
      toast.error(error.message)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-lg p-6 shadow-sm text-center space-y-2">
          <p className="font-medium">Проверете ја вашата е-пошта</p>
          <p className="text-sm text-zinc-500">Испративме потврден линк. Кликнете на него за да ја активирате сметката.</p>
          <Link href="/auth/login" className="text-xs underline text-zinc-400">Назад кон најава</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-bold">Подобар Прилеп</h1>
          <p className="text-sm text-zinc-500 mt-1">Создадете сметка</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-700">Целосно име</label>
            <input {...register('full_name')} className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-black" />
            {errors.full_name && <p className="text-[11px] text-red-500 mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Е-пошта</label>
            <input {...register('email')} type="email" className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-black" />
            {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Лозинка</label>
            <input {...register('password')} type="password" className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-black" />
            {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Се создава…' : 'Создај сметка'}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-2 text-[11px] text-zinc-400">или</span></div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={signUpWithGoogle}
            disabled={isSubmitting || oauthLoading}>
            {oauthLoading ? 'Се пренасочува…' : 'Продолжи со Google'}
          </Button>
        </form>
        <p className="text-xs text-zinc-500 text-center mt-4">
          Веќе имате сметка?{' '}
          <Link href="/auth/login" className="underline text-zinc-700">Најавете се</Link>
        </p>
      </div>
    </div>
  )
}
