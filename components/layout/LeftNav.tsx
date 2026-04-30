'use client'

import { MapPin, AlertCircle, Star, Banknote, Lightbulb, Users, Droplets, Trash2, Zap } from 'lucide-react'
import NavItem from '../ui/NavItem'

const districts = [
  { value: 'all',      label: 'Прилеп'    },
  { value: 'Center',   label: 'Центар'    },
  { value: 'Varoš',    label: 'Варош'     },
  { value: 'Trizla',   label: 'Тризла'    },
  { value: 'Točila',   label: 'Точила'    },
  { value: 'Rid',      label: 'Рид'       },
  { value: 'Tri Bari', label: 'Типски'  },
] as const

export default function LeftNav() {
  return (
    <nav className="overflow-y-auto border-r border-zinc-200 py-3 px-2 flex flex-col gap-4 bg-white">
      <section>
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1">Платформа</p>
        <div className="flex flex-col gap-0.5">
          <NavItem href="/"            label="Почетна"    icon={MapPin}      exact />
          <NavItem href="/issues"      label="Пријави"    icon={AlertCircle} />
          <NavItem href="/heroes"      label="Херои"      icon={Star} />
          <NavItem href="/fund"        label="Фонд"       icon={Banknote} />
          <NavItem href="/ideas"       label="Идеи"       icon={Lightbulb} />
          <NavItem href="/communities" label="Населби"    icon={Users} />
        </div>
      </section>

      <section>
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1">Комунални</p>
        <div className="flex flex-col gap-0.5">
          <NavItem href="/utility/water"   label="Водовод"    icon={Droplets} />
          <NavItem href="/utility/garbage" label="Комунален"  icon={Trash2} />
          <NavItem href="/utility/power"   label="Електрична" icon={Zap} />
        </div>
      </section>

      <section>
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1">Населби</p>
        <div className="flex flex-col gap-0.5">
          {districts.map(d => (
            <NavItem
              key={d.value}
              href={d.value === 'all' ? '/issues' : `/issues?district=${d.value}`}
              label={d.label}
              exact={d.value === 'all'}
            />
          ))}
        </div>
      </section>
    </nav>
  )
}
