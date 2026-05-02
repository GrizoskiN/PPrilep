"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { LogOut, UserCircle2 } from "lucide-react";
import AvatarInitials from "../ui/AvatarInitials";
import type { Profile } from "../../lib/types/database";

interface Props {
  profile: Profile | null;
  onSignOut: () => void;
}

export default function UserMenu({ profile, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded hover:bg-zinc-100 p-1 transition-colors">
        <AvatarInitials
          name={profile?.full_name}
          avatarUrl={profile?.avatar_url}
          size="sm"
        />
        <span className="hidden max-w-20 truncate text-xs text-zinc-600 sm:block">
          {profile?.full_name ?? "Профил"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-zinc-200 rounded shadow-lg z-50 py-1">
          <div className="px-3 py-2 border-b border-zinc-100">
            <p className="text-xs font-medium truncate">
              {profile?.full_name ?? "Корисник"}
            </p>
            <p className="text-[11px] text-zinc-400 truncate">
              {profile?.username ? `@${profile.username}` : ""}
            </p>
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
            <UserCircle2 size={13} /> Мој профил
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
            <LogOut size={13} /> Одјави се
          </button>
        </div>
      )}
    </div>
  );
}
