"use client";

import { useState, useEffect, useMemo } from "react";
import { Heart } from "lucide-react";
import { useRightPanel } from "../../../lib/context/RightPanelContext";
import SponsorsRightPanel from "../../../components/sponsors/SponsorsRightPanel";
import PartnerModal from "../../../components/sponsors/PartnerModal";
import { createClient } from "../../../lib/supabase/client";

export default function SponsorsLayout({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const { setOverridePanel } = useRightPanel();

  const [memberCount, setMemberCount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string | null; email: string | null } | null>(null);

  const fetchCounts = useMemo(
    () => () =>
      Promise.all([
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
      ]).then(([people, companies]) => {
        setMemberCount(people.count ?? 0);
        setCompanyCount(companies.count ?? 0);
      }),
    [supabase],
  );

  useEffect(() => {
    // Initial fetch
    fetchCounts();

    // Get current user for pre-fill
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", u.id)
        .single()
        .then(({ data }) =>
          setUser({ id: u.id, name: data?.full_name ?? null, email: u.email ?? null }),
        );
    });

    // Realtime: re-fetch counts whenever any profile's membership_tier changes
    const channel = supabase
      .channel("membership-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchCounts(),
      )
      .subscribe();

    // Clear the override and realtime subscription when leaving
    return () => {
      supabase.removeChannel(channel);
      setOverridePanel(null);
    };
  }, [supabase, fetchCounts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push the right panel into context whenever counts or modal state changes
  useEffect(() => {
    setOverridePanel(
      <SponsorsRightPanel
        memberCount={memberCount}
        companyCount={companyCount}
        onJoin={() => setModalOpen(true)}
      />
    );
  }, [memberCount, companyCount, setOverridePanel]);

  return (
    <>
      {children}

      {/* Mobile "Стани член" FAB — replaces the global "+" on this route */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-5 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90 lg:hidden"
        style={{ background: "#2aa99d" }}
        aria-label="Стани член">
        <Heart size={17} />
        Стани член
      </button>

      {modalOpen && (
        <PartnerModal
          onClose={() => setModalOpen(false)}
          userId={user?.id}
          prefillName={user?.name}
          prefillEmail={user?.email}
        />
      )}
    </>
  );
}
