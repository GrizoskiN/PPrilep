"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

/**
 * Custom dropdown to replace native <select>. Avoids the iOS native picker
 * (no auto-zoom, no gray tap flash) and gives full styling control:
 * rounded items, primary-color hover, animated chevron.
 */
export default function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const label = current?.label ?? placeholder ?? "—";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 lg:py-2 text-[11px] lg:text-sm font-medium text-slate-700 outline-none transition-colors hover:border-zinc-400 focus:border-primary [-webkit-tap-highlight-color:transparent]">
        <span className="truncate">{label}</span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 min-w-full w-max max-w-[calc(100vw-1rem)] max-h-72 overflow-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg"
          style={{ backgroundColor: "#ffffff" }}>
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[12px] lg:text-sm font-medium transition-colors whitespace-nowrap [-webkit-tap-highlight-color:transparent]",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-slate-700 hover:bg-primary/10 hover:text-primary",
                )}>
                <span>{opt.label}</span>
                {active && <Check size={14} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
