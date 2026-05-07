"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Trophy,
  Lightbulb,
  MapPin,
  Bell,
  X,
} from "lucide-react";
import { useAuth } from "../../lib/hooks/useAuth";
import { createClient } from "../../lib/supabase/client";
import { isMissingNotificationsTableError } from "../../lib/notifications";
import { formatDays, getIssuePath, parseIssueIdFromSegment } from "../../lib/utils";
import type { AppNotification, Profile } from "../../lib/types/database";

function resolveNotifLink(link: string, title: string): string {
  const segment = link.startsWith("/issues/") ? link.slice("/issues/".length) : null;
  if (!segment) return link;
  const id = parseIssueIdFromSegment(segment);
  if (!id) return link;
  return getIssuePath(id, title);
}

const NAV_ITEMS = [
  { href: "/issues", label: "Пријави", icon: AlertTriangle },
  { href: "/heroes", label: "Херои", icon: Trophy },
  { href: "/ideas", label: "Идеи", icon: Lightbulb },
  { href: "/communities", label: "Населби", icon: MapPin },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const notifOpenRef = useRef(false);

  async function loadUnreadCount() {
    if (!user) return;
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_user_id", user.id)
      .is("read_at", null);
    if (!error && !isMissingNotificationsTableError(error)) {
      setUnreadCount(count ?? 0);
    }
  }

  async function loadNotifications() {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, recipient_user_id, actor_user_id, type, title, body, link, read_at, created_at",
      )
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as AppNotification[];
    const actorIds = [...new Set(rows.map((n) => n.actor_user_id))];
    let actorMap = new Map<string, Profile>();

    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username, points, created_at")
        .in("id", actorIds);
      actorMap = new Map(
        (actors ?? []).map((a) => [a.id, a as Profile]),
      );
    }

    setNotifications(
      rows.map((n) => ({ ...n, actor: actorMap.get(n.actor_user_id) ?? null })),
    );
    setLoading(false);

    if (unreadCount > 0) {
      const now = new Date().toISOString();
      const { error: markErr } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("recipient_user_id", user.id)
        .is("read_at", null);
      if (!markErr) {
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: now })),
        );
      }
    }
  }

  useEffect(() => {
    if (!user) return;
    loadUnreadCount();

    const channel = supabase
      .channel(`bottom-nav-notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          loadUnreadCount();
          if (notifOpenRef.current) loadNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function openNotifPanel() {
    notifOpenRef.current = true;
    setNotifOpen(true);
    loadNotifications();
  }

  function closeNotifPanel() {
    notifOpenRef.current = false;
    setNotifOpen(false);
  }

  function handleBellPress() {
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname ?? "/")}`);
      return;
    }
    if (notifOpen) {
      closeNotifPanel();
    } else {
      openNotifPanel();
    }
  }

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch border-t border-[#e4ece8] bg-white lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
              onClick={closeNotifPanel}>
              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 1.8}
                className={active ? "text-primary" : "text-slate-400"}
              />
              <span
                className={`text-[10px] font-semibold ${active ? "text-primary" : "text-slate-400"}`}>
                {label}
              </span>
            </Link>
          );
        })}

        {/* Notifications tab */}
        <button
          onClick={handleBellPress}
          className="relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors">
          <span className="relative">
            <Bell
              size={20}
              strokeWidth={notifOpen ? 2.4 : 1.8}
              className={notifOpen ? "text-primary" : "text-slate-400"}
            />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <span
            className={`text-[10px] font-semibold ${notifOpen ? "text-primary" : "text-slate-400"}`}>
            Известувања
          </span>
        </button>
      </nav>

      {/* Notification panel */}
      {notifOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={closeNotifPanel}
          />
          <div className="fixed bottom-16 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-2xl lg:hidden overflow-hidden">
            {/* drag handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-1 w-10 rounded-full bg-zinc-200" />
            </div>

            <div className="flex items-center justify-between px-4 pb-2">
              <div className="flex items-center gap-2">
                <Bell size={13} className="text-zinc-500" />
                <p className="text-sm font-semibold text-zinc-800">Известувања</p>
              </div>
              <button
                onClick={closeNotifPanel}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100">
                <X size={16} />
              </button>
            </div>

            <div className="border-t border-zinc-100 max-h-[55vh] overflow-y-auto">
              <div className="px-3 py-2 space-y-1">
                {loading && (
                  <p className="py-5 text-center text-xs text-zinc-400">
                    Се вчитуваат известувања...
                  </p>
                )}
                {!loading && notifications.length === 0 && (
                  <p className="py-5 text-center text-xs text-zinc-400">
                    Нема известувања.
                  </p>
                )}
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={resolveNotifLink(n.link, n.title)}
                    onClick={closeNotifPanel}
                    className={`block rounded-xl px-3 py-2.5 active:bg-zinc-100 ${
                      !n.read_at ? "bg-teal-50" : "hover:bg-zinc-50"
                    }`}>
                    <p className="text-sm font-semibold text-zinc-800">
                      {n.actor?.full_name ?? n.actor?.username ?? "Некој"}{" "}
                      <span className="font-normal text-zinc-600">{n.body}</span>
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {formatDays(n.created_at)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
