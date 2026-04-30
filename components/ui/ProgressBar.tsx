interface Props {
  value: number
  max: number
  className?: string
  color?: 'teal' | 'black' | 'amber' | 'red'
}

export default function ProgressBar({ value, max, className, color = 'teal' }: Props) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const barColor = {
    teal:  'bg-teal-500',
    black: 'bg-zinc-900',
    amber: 'bg-amber-400',
    red:   'bg-red-500',
  }[color]

  return (
    <div className={`w-full bg-zinc-100 rounded-full h-1.5 ${className ?? ''}`}>
      <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}
