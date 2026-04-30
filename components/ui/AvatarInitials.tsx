import { cn } from '../../lib/utils'

interface Props {
  name?: string | null
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function AvatarInitials({ name, avatarUrl, size = 'md', className }: Props) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-xs'

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name ?? ''} className={cn('rounded-full object-cover', sizeClass, className)} />
    )
  }

  return (
    <div className={cn('rounded-full bg-zinc-900 text-white flex items-center justify-center font-semibold select-none', sizeClass, className)}>
      {initials}
    </div>
  )
}
