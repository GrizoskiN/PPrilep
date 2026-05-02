'use client'

const ALERTS = [
  { icon: '💧', text: 'ВОДОВОД — Плански прекин на водоснабдување во Варош и Центар — 7 мај (среда) 06:00–16:00' },
  { icon: '⚡', text: 'ЕЛЕКТРИЧНА — Прекин на струја во Тризла (ул. Климент Охридски, Братство) — 7 мај 10:00–14:00' },
  { icon: '🚧', text: 'СООБРАЌАЈ — Затворена ул. Партизанска за асфалтирање 6–10 мај, користете алтернативни правци' },
  { icon: '⚠️', text: 'ИТНО — Излевање на канализација во Точила кај пазарот — пријавено, екипата е на терен' },
  { icon: '🗑️', text: 'КОМУНАЛЕН — Забавено собирање на отпад поради дефект на возило — очекувано нормализирање утре' },
]

const full = [...ALERTS, ...ALERTS].map((a) => `${a.icon}  ${a.text}`).join('     ·     ')

export default function MarqueeBanner() {
  return (
    <div className="bg-red-600 text-zinc-100 h-11 flex items-center overflow-hidden border-b border-zinc-700 shrink-0 ">
      <span className="text-[10px] font-bold uppercase tracking-widest px-3 text-teal-400 shrink-0 border-r border-zinc-700 mr-3 h-full flex items-center">
        LIVE
      </span>
      <div className="overflow-hidden flex-1 relative">
        <span className="animate-marquee text-[11px] tracking-wide">
          {full}
        </span>
      </div>
    </div>
  )
}
