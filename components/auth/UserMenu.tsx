"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, LogOut, UserCircle2 } from "lucide-react";
import AvatarInitials from "../ui/AvatarInitials";
import { isMissingNotificationsTableError } from "../../lib/notifications";
import { createClient } from "../../lib/supabase/client";
import { formatDays } from "../../lib/utils";
import type { AppNotification, Profile } from "../../lib/types/database";

interface Props {
  userId: string;
  profile: Profile | null;
  onSignOut: () => void;
}

export default function UserMenu({ userId, profile, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  async function loadUnreadCount() {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_user_id", userId)
      .is("read_at", null);

    if (error) {
      if (!isMissingNotificationsTableError(error)) {
        console.error("[UserMenu] unread notifications error:", error.message);
      }
      return;
    }

    setUnreadCount(count ?? 0);
  }

  async function loadNotifications() {
    setLoadingNotifications(true);

    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, recipient_user_id, actor_user_id, type, title, body, link, read_at, created_at",
      )
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      if (isMissingNotificationsTableError(error)) {
        setNotifications([]);
        setUnreadCount(0);
      } else {
        console.error("[UserMenu] notifications fetch error:", error.message);
      }
      setLoadingNotifications(false);
      return;
    }

    const rows = (data ?? []) as AppNotification[];
    const actorIds = [
      ...new Set(rows.map((notification) => notification.actor_user_id)),
    ];

    let actorMap = new Map<string, Profile>();

    if (actorIds.length > 0) {
      const { data: actors, error: actorsError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username, points, created_at")
        .in("id", actorIds);

      if (actorsError) {
        console.error(
          "[UserMenu] notification actors fetch error:",
          actorsError.message,
        );
      } else {
        actorMap = new Map(
          (actors ?? []).map((actor) => [actor.id, actor as Profile]),
        );
      }
    }

    const normalized = rows.map((notification) => ({
      ...notification,
      actor: actorMap.get(notification.actor_user_id) ?? null,
    }));

    setNotifications(normalized);
    setLoadingNotifications(false);

    if (unreadCount > 0) {
      const now = new Date().toISOString();
      const { error: markReadError } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("recipient_user_id", userId)
        .is("read_at", null);

      if (!markReadError) {
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, read_at: now })),
        );
      }
    }
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    loadUnreadCount();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        () => {
          loadUnreadCount();
          if (open) loadNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, supabase, userId]);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center gap-1.5 rounded hover:bg-zinc-100 p-1 transition-colors">
        <AvatarInitials
          name={profile?.full_name}
          avatarUrl={profile?.avatar_url}
          size="sm"
        />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className="hidden max-w-20 truncate text-xs text-zinc-600 sm:block">
          {profile?.full_name ?? "Профил"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-zinc-200 rounded shadow-lg z-50 py-1">
          <div className="px-3 py-2 border-b border-zinc-100">
            <p className="text-xs font-medium truncate">
              {profile?.full_name ?? "Корисник"}
            </p>
            <p className="text-[11px] text-zinc-400 truncate">
              {profile?.username ? `@${profile.username}` : ""}
            </p>
          </div>
          <div className="border-b border-zinc-100 px-3 py-2">
            <div className="mb-2 flex items-center gap-2">
              <Bell size={13} className="text-zinc-500" />
              <p className="text-xs font-semibold text-zinc-700">Известувања</p>
            </div>
            <div className="space-y-1.5">
              {loadingNotifications && (
                <p className="text-xs text-zinc-400">
                  Се вчитуваат известувања...
                </p>
              )}
              {!loadingNotifications && notifications.length === 0 && (
                <p className="text-xs text-zinc-400">Нема известувања.</p>
              )}
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.link}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg border border-zinc-100 px-2.5 py-2 hover:bg-zinc-50">
                  <p className="text-xs font-semibold text-zinc-800">
                    {notification.actor?.full_name ??
                      notification.actor?.username ??
                      "Некој"}{" "}
                    {notification.body}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    {formatDays(notification.created_at)}
                  </p>
                </Link>
              ))}
            </div>
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
