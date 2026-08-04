"use client";

import { useState, useEffect, useId, useMemo, useCallback } from "react";
import SponsorsRightPanel from "./SponsorsRightPanel";
import { createClient } from "../../lib/supabase/client";

// Self-contained sponsors panel: manages its own counts + realtime so the
// layout can inject it ONCE (stable), avoiding cascading re-renders.
export default function SponsorsPanelContent({ onJoin }: { onJoin: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const instanceId = useId();
  const [memberCount, setMemberCount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    const [{ count: members }, { count: companies }, { count: manual }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("membership_tier", "is", null)
        .not("membership_tier", "in", '("company_basic","company_preferred","company_premium")')
        .eq("is_company", false),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("membership_tier", ["company_basic", "company_preferred", "company_premium"]),
      // Hand-entered partners count too, or this stat contradicts the list
      // right next to it.
      supabase
        .from("partners")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
    ]);
    setMemberCount(members ?? 0);
    setCompanyCount((companies ?? 0) + (manual ?? 0));
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCounts();
    }, 0);
    const channel = supabase
      .channel(`sponsors-panel-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" },
        () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "partners" },
        () => fetchCounts())
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchCounts, instanceId]);

  return (
    <SponsorsRightPanel
      memberCount={memberCount}
      companyCount={companyCount}
      onJoin={onJoin}
    />
  );
}
