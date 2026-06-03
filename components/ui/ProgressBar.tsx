interface Props {
  value: number
  max: number
  className?: string
  color?: 'teal' | 'black' | 'amber' | 'red' | 'green'
  size?: 'sm' | 'md'
}

export default function ProgressBar({ value, max, className, color = 'teal', size = 'sm' }: Props) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const barColor = {
    teal:  'bg-teal-500',
    black: 'bg-zinc-900',
    amber: 'bg-amber-400',
    red:   'bg-red-500',
    green: 'bg-emerald-500',
  }[color]
  const h = size === 'md' ? 'h-2.5' : 'h-1.5'

  return (
    <div className={`w-full bg-zinc-100 rounded-full ${h} ${className ?? ''}`}>
      <div className={`${barColor} ${h} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}
