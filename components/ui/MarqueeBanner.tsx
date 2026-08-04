"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

// How long an agency alert stays in the banner after it's posted. There's no
// expires_at column on agency_posts, so recency is the auto-clear mechanism.
const WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// Icon per sending institution; red alerts override with a warning sign.
const AGENCY_ICON: Record<string, string> = {
  vodovod: "💧",
  komunalec: "🗑️",
  osvetluvanje: "💡",
  evn: "⚡",
  transport_parking: "🚧",
  municipality: "🏛️",
};

interface AgencyAlert {
  id: number;
  agency_id: string;
  title: string;
  body: string | null;
  is_red_alert: boolean;
  created_at: string;
}

function iconFor(a: AgencyAlert): string {
  if (a.is_red_alert) return "⚠️";
  return AGENCY_ICON[a.agency_id] ?? "📢";
}

function label(a: AgencyAlert): string {
  const text = a.body ? `${a.title} — ${a.body}` : a.title;
  return `${iconFor(a)}  ${text}`;
}

export default function MarqueeBanner() {
  const supabase = useMemo(() => createClient(), []);
  const [alerts, setAlerts] = useState<AgencyAlert[]>([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      const since = new Date(Date.now() - WINDOW_MS).toISOString();
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("agency_posts")
        .select("id, agency_id, title, body, is_red_alert, created_at, starts_at, ends_at")
        .gte("created_at", since)
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order("is_red_alert", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);
      if (!alive || error) return;
      setAlerts((data ?? []) as AgencyAlert[]);
    }

    void load();

    // Live-update the banner when a new alert is published.
    const channel = supabase
      .channel(`marquee-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agency_posts" },
        () => void load(),
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // No active alerts → no banner (the layout simply has no bar).
  if (alerts.length === 0) return null;

  // Duplicate the list so the marquee loop is seamless.
  const full = [...alerts, ...alerts].map(label).join("     ·     ");

  return (
    <div className="bg-theme-ink text-theme-on-dark h-11 flex items-center overflow-hidden border-b border-zinc-700 shrink-0 ">
      <span className="text-[10px] font-bold uppercase tracking-widest px-3 text-theme-accent shrink-0 border-r border-zinc-700 mr-3 h-full flex items-center">
        LIVE
      </span>
      <div className="overflow-hidden flex-1 relative">
        <span className="animate-marquee text-[11px] tracking-wide text-theme-on-dark">
          {full}
        </span>
      </div>
    </div>
  );
}
