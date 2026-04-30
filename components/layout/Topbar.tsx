'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import Button from '../ui/Button'
import UserMenu from '../auth/UserMenu'
import { useAuth } from '../../lib/hooks/useAuth'
import { useState } from 'react'
import dynamic from 'next/dynamic'

const ReportModal = dynamic(() => import('../issues/ReportModal'), { ssr: false })

export default function Topbar() {
  const { user, profile, signOut } = useAuth()
  const [reportOpen, setReportOpen] = useState(false)

  return (
    <>
      <header className="col-span-3 border-b border-zinc-200 flex items-center justify-between px-4 h-12 bg-white z-10">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <span className="font-bold text-sm tracking-tight">Подобар</span>
          <span className="font-bold text-sm tracking-tight text-teal-600">Прилеп</span>
          <span className="text-[10px] bg-teal-50 text-teal-600 border border-teal-200 px-1.5 py-0.5 rounded-md font-medium">БЕТА</span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button size="sm" variant="teal" onClick={() => setReportOpen(true)}>
                <Plus size={13} /> Пријави проблем
              </Button>
              <UserMenu profile={profile} onSignOut={signOut} />
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Најава</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" variant="teal">Регистрација</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {reportOpen && (
        <ReportModal
          userId={user?.id}
          onClose={() => setReportOpen(false)}
          onSuccess={() => setReportOpen(false)}
        />
      )}
    </>
  )
}
