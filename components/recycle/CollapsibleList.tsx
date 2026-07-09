"use client";

import { useState } from "react";
import { ChevronDown, ImageIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import type { GlassContainer } from "../../lib/data/glassContainers";

interface Props {
  title: string;
  subtitle: string;
  items: GlassContainer[];
  accent: "blue" | "zinc";
  defaultOpen?: boolean;
}

export default function CollapsibleList({
  title,
  subtitle,
  items,
  accent,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const dot = accent === "blue" ? "bg-blue-500" : "bg-zinc-300";

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50">
        <div className="flex-1">
          <p className="text-sm font-semibold text-zinc-800">{title}</p>
          <p className="text-xs text-zinc-400">{subtitle}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-600">
          {items.length}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-zinc-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ol className="grid gap-x-4 gap-y-1.5 border-t border-zinc-100 px-4 py-3.5 sm:grid-cols-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-start gap-2 text-xs leading-relaxed text-zinc-600">
              <span
                className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
              />
              <span className="flex-1">{c.name}</span>
              {c.photos && c.photos.length > 0 && (
                <span
                  className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-[10px] text-zinc-400"
                  title={`${c.photos.length} фотографии`}>
                  <ImageIcon size={11} />
                  {c.photos.length}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
