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
  isActive?: boolean;
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
  isActive = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
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
        className={cn(
          "w-full flex h-9 items-center justify-between gap-2 rounded-lg border px-2.5 text-[11px] font-medium outline-none transition-colors [-webkit-tap-highlight-color:transparent]",
          isActive
            ? "border-theme bg-theme-surface-muted text-theme-ink"
            : "border-theme bg-theme-surface text-theme-body hover:bg-theme-surface-muted",
          "focus-visible:ring-2 focus-visible:ring-[#d9e1e8]",
        )}>
        <span className="truncate">{label}</span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 transition-transform",
            isActive ? "text-theme-ink" : "text-theme-muted",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-full w-max max-w-[calc(100vw-1rem)] max-h-72 overflow-auto rounded-lg border border-theme bg-theme-surface p-1 shadow-[0_6px_18px_rgba(15,23,43,0.1)]">
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
                  "w-full flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-[11px] font-medium transition-colors whitespace-nowrap [-webkit-tap-highlight-color:transparent]",
                  active
                    ? "bg-theme-surface-muted text-theme-ink"
                    : "text-theme-body hover:bg-theme-surface-muted hover:text-theme-ink",
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
