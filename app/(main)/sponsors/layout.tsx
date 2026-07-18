"use client";

import { useState, useLayoutEffect, useCallback, useEffect } from "react";
import { Heart } from "lucide-react";
import { useRightPanel } from "../../../lib/context/RightPanelContext";
import { useAuth } from "../../../lib/hooks/useAuth";
import SponsorsPanelContent from "../../../components/sponsors/SponsorsPanelContent";
import PartnerModal from "../../../components/sponsors/PartnerModal";

export default function SponsorsLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const { setOverridePanel } = useRightPanel();

  // Start open when arriving via a "?join=1" link (e.g. the "Стани член" CTA on
  // the About page). Lazy initialiser reads the query once on the client —
  // avoids useSearchParams (no Suspense boundary needed) and an effect.
  const [modalOpen, setModalOpen] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("join"),
  );

  const openModal = useCallback(() => setModalOpen(true), []);

  // Inject the self-contained panel ONCE (stable deps) before first paint.
  useLayoutEffect(() => {
    setOverridePanel(<SponsorsPanelContent onJoin={openModal} />, "/sponsors");
    return () => setOverridePanel(null, "/sponsors");
  }, [openModal, setOverridePanel]);

  useEffect(() => {
    const handleOpenModal = () => setModalOpen(true);
    window.addEventListener("open-partner-modal", handleOpenModal);
    return () => window.removeEventListener("open-partner-modal", handleOpenModal);
  }, []);

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
          prefillName={profile?.full_name ?? null}
          prefillEmail={user?.email ?? null}
        />
      )}
    </>
  );
}
