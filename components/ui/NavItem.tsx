'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '../../lib/utils'
import { LucideIcon } from 'lucide-react'

interface Props {
  href: string
  label: string
  icon?: LucideIcon
  exact?: boolean
}

export default function NavItem({ href, label, icon: Icon, exact }: Props) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer',
        active
          ? 'bg-zinc-900 text-white'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
      )}
    >
      {Icon && <Icon size={15} />}
      {label}
    </Link>
  )
}
