'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

interface NominatimResult {
  place_id: number
  display_name: string
  address: {
    road?: string
    quarter?: string
    suburb?: string
    city?: string
  }
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function StreetAutocomplete({ value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    onChange(q)
    setOpen(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 3) { setResults([]); return }

    debounceRef.current = setTimeout(() => search(q), 350)
  }

  async function search(q: string) {
    setLoading(true)
    try {
      // Nominatim — free, no API key, rate limit 1 req/s. Bounded to Прилеп, MK.
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Прилеп')}&format=json&addressdetails=1&countrycodes=mk&limit=6&accept-language=mk`
      const res = await fetch(url, { headers: { 'User-Agent': 'PodobarPrilep/1.0 (civic-platform)' } })
      const data: NominatimResult[] = await res.json()
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function selectResult(result: NominatimResult) {
    const label = result.address.road
      ? `${result.address.road}${result.address.quarter ? ', ' + result.address.quarter : ''}`
      : result.display_name.split(',')[0]
    setQuery(label)
    onChange(label)
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? 'пр. ул. Партизанска'}
          className="w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-teal-500 transition-colors"
        />
        {loading && (
          <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {results.map(r => {
            const road = r.address.road ?? r.display_name.split(',')[0]
            const area = r.address.quarter ?? r.address.suburb ?? ''
            return (
              <button
                key={r.place_id}
                type="button"
                onClick={() => selectResult(r)}
                className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-teal-50 transition-colors cursor-pointer"
              >
                <MapPin size={12} className="text-teal-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-zinc-800">{road}</p>
                  {area && <p className="text-[11px] text-zinc-400">{area}</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
