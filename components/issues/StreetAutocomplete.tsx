"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import {
  type Street,
  getStreetFuse,
  prettyStreetName,
} from "../../lib/data/streets";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Fires when the user picks a suggestion (vs. free-text typing). Lets
   *  the parent auto-fill related fields like district. */
  onSelect?: (street: Street) => void;
}

export default function StreetAutocomplete({
  value,
  onChange,
  placeholder,
  onSelect,
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep input synced if parent updates externally (form reset / edit)
  useEffect(() => {
    const id = setTimeout(() => setQuery(value), 0);
    return () => clearTimeout(id);
  }, [value]);

  // Shared Fuse index from lib/data/streets — built once, reused everywhere.
  const fuse = useMemo(() => getStreetFuse(), []);

  // Compute results from the current query (cheap, no debounce needed —
  // Fuse is sub-millisecond for ~300 entries).
  const results = useMemo<Street[]>(() => {
    const q = query.trim().toLocaleLowerCase("mk");
    if (q.length < 2) return [];
    return fuse.search(q, { limit: 8 }).map((r) => r.item);
  }, [query, fuse]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    setOpen(true);
    setHighlightIndex(0);
  }

  function selectStreet(s: Street) {
    // Always save the canonical Cyrillic name to the database
    const canonical = prettyStreetName(s.name);
    setQuery(canonical);
    onChange(canonical);
    setOpen(false);
    onSelect?.(s);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = results[highlightIndex];
      if (picked) selectStreet(picked);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "пр. ул. Партизанска"}
          className="w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-teal-500 transition-colors"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {results.map((s, idx) => {
            const display = prettyStreetName(s.name);
            const oldNote = s.old_name
              ? `поранешна ${prettyStreetName(s.old_name)}`
              : null;
            const isActive = idx === highlightIndex;
            return (
              <button
                key={s.name}
                type="button"
                onMouseEnter={() => setHighlightIndex(idx)}
                onClick={() => selectStreet(s)}
                className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                  isActive ? "bg-teal-50" : "hover:bg-zinc-50"
                }`}>
                <MapPin
                  size={12}
                  className="text-teal-500 mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-800 truncate">
                    {display}
                  </p>
                  {oldNote && (
                    <p className="text-[11px] text-zinc-400 truncate">
                      {oldNote}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
