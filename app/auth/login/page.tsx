import Link from 'next/link'
import LoginForm from '../../../components/auth/LoginForm'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-bold">Подобар Прилеп</h1>
          <p className="text-sm text-zinc-500 mt-1">Најавете се на вашата сметка</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="text-xs text-zinc-500 text-center mt-4">
          Немате сметка?{' '}
          <Link href="/auth/register" className="underline text-zinc-700">Регистрирајте се</Link>
        </p>
      </div>
    </div>
  )
}
