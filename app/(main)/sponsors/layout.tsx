"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { Heart } from "lucide-react";
import { useRightPanel } from "../../../lib/context/RightPanelContext";
import SponsorsPanelContent from "../../../components/sponsors/SponsorsPanelContent";
import PartnerModal from "../../../components/sponsors/PartnerModal";
import { createClient } from "../../../lib/supabase/client";

export default function SponsorsLayout({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const { setOverridePanel } = useRightPanel();

  const [modalOpen, setModalOpen] = useState(false);
  const [user, setUser] = useState<{
    id: string; name: string | null; email: string | null;
  } | null>(null);

  const openModal = useCallback(() => setModalOpen(true), []);

  // Inject the self-contained panel ONCE (stable deps) before first paint.
  useLayoutEffect(() => {
    setOverridePanel(<SponsorsPanelContent onJoin={openModal} />, "/sponsors");
    return () => setOverridePanel(null);
  }, [openModal, setOverridePanel]);

  // Fetch current user for modal pre-fill (independent of the panel)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      supabase.from("profiles").select("full_name").eq("id", u.id).single()
        .then(({ data }) =>
          setUser({ id: u.id, name: data?.full_name ?? null, email: u.email ?? null }),
        );
    });
  }, [supabase]);

  return (
    <>
      {children}

      <button
        onClick={openModal}
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
