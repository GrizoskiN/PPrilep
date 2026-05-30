"use client";

import { useRef, useState } from "react";
import { Link2, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

interface Props {
  /** The URL that will be shared / copied. */
  url: string;
  /** Used as the text prefix in WhatsApp / Viber messages. */
  title: string;
  /** Extra classes for the trigger button. */
  className?: string;
  /** Show a text label next to the icon (default: false). */
  showLabel?: boolean;
}

export default function ShareSheet({
  url,
  title,
  className,
  showLabel = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function openSheet() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right - 15 });
    }
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(url);
    toast.success("Линкот е копиран!");
    close();
  }

  function shareInstagram() {
    navigator.clipboard.writeText(url);
    toast.message("Линкот е копиран — залепи го во Instagram порака или bio.");
    close();
  }

  const items = [
    {
      label: "Копирај линк",
      icon: <Link2 size={15} />,
      href: null as string | null,
      action: copyLink,
    },
    {
      label: "Facebook",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      ),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      action: null as (() => void) | null,
    },
    {
      label: "Instagram",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-3.5 w-3.5">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      ),
      href: null,
      action: shareInstagram,
    },
    {
      label: "WhatsApp",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
      action: null,
    },
    {
      label: "Viber",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.07-1.35A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 14.5c-.28 0-.53-.11-.71-.29l-2-2a1 1 0 0 1 0-1.42l.5-.5c.2-.2.2-.51 0-.71l-2-2a.5.5 0 0 0-.71 0l-.5.5C7.08 11.08 7 12 7 12c0 2.76 2.24 5 5 5 0 0 .92-.08 1.92-1.08l.5-.5c.2-.2.2-.51 0-.71l-2-2a.5.5 0 0 0-.71 0l-.5.5c-.2.2-.51.2-.71 0z" />
        </svg>
      ),
      href: `viber://forward?text=${encodeURIComponent(`${title} ${url}`)}`,
      action: null,
    },
  ];

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          openSheet();
        }}
        className={cn(
          "flex items-center gap-1 font-medium text-zinc-500 transition-colors hover:text-zinc-800",
          className,
        )}>
        <Send size={15} />
        {showLabel && <span>Сподели</span>}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
          />
          <div
            className="fixed z-50 w-48 overflow-hidden rounded-xl bg-white shadow-lg border border-zinc-100"
            style={{ top: pos.top, right: pos.right }}
            onClick={(e) => e.stopPropagation()}>
            {items.map((item) =>
              item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
                  <span className="text-zinc-400">{item.icon}</span>
                  {item.label}
                </a>
              ) : (
                <button
                  key={item.label}
                  onClick={item.action ?? close}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
                  <span className="text-zinc-400">{item.icon}</span>
                  {item.label}
                </button>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
