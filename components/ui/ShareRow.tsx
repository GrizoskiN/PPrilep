"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** Absolute URL to share. */
  url: string;
  /** Text prefix for WhatsApp / Viber messages. */
  title: string;
}

/**
 * Inline row of share buttons for the end of a post / project. Mirrors the
 * targets in ShareSheet but renders them as always-visible labelled buttons.
 */
export default function ShareRow({ url, title }: Props) {
  const text = encodeURIComponent(`${title} ${url}`);

  const links = [
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      ),
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${text}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
    {
      label: "Viber",
      href: `viber://forward?text=${text}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.07-1.35A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 14.5c-.28 0-.53-.11-.71-.29l-2-2a1 1 0 0 1 0-1.42l.5-.5c.2-.2.2-.51 0-.71l-2-2a.5.5 0 0 0-.71 0l-.5.5C7.08 11.08 7 12 7 12c0 2.76 2.24 5 5 5 0 0 .92-.08 1.92-1.08l.5-.5c.2-.2.2-.51 0-.71l-2-2a.5.5 0 0 0-.71 0l-.5.5c-.2.2-.51.2-.71 0z" />
        </svg>
      ),
    },
  ];

  function copyLink() {
    navigator.clipboard.writeText(url);
    toast.success("Линкот е копиран!");
  }

  return (
    <div className="mt-8 border-t border-zinc-100 pt-5">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.13em] text-theme-subtle">
        Сподели
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900">
            <span className="text-zinc-400">{l.icon}</span>
            {l.label}
          </a>
        ))}
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900">
          <Link2 className="h-4 w-4 text-zinc-400" />
          Копирај линк
        </button>
      </div>
    </div>
  );
}
