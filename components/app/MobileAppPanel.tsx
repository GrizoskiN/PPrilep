"use client";

import { useState } from "react";
import Image from "next/image";
import AppPromoModal from "./AppPromoModal";

/**
 * Right-panel card promoting the native apps. Sits at the top of the web
 * sidebar; clicking it opens a dialog with a QR code for each store. The
 * border is a soft, slowly travelling dotted outline drawn as an SVG overlay
 * so it scales to any size.
 */
export default function MobileAppPanel() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="lg:p-3">
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="relative flex w-full items-center gap-3 rounded-2xl bg-theme-surface p-3 text-left transition-colors hover:bg-theme-surface-muted">
        {/* Soft, slow dotted border */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-zinc-300"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true">
          <rect
            x="1.5"
            y="1.5"
            rx="15"
            ry="15"
            style={{ width: "calc(100% - 3px)", height: "calc(100% - 3px)" }}
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="1 7"
            strokeLinecap="round"
            className="pp-marching-ants"
          />
        </svg>

        <Image
          src="/logo/app-icon-192.png"
          alt="Мој Прилеп"
          width={40}
          height={40}
          className="relative shrink-0 rounded-xl"
        />
        <div className="relative min-w-0">
          <p className="text-[13px] font-semibold leading-tight text-theme-heading">
            Преземи ја апликацијата
          </p>
          <p className="text-[11px] leading-tight text-theme-muted">
            Достапна на iOS и Android.
          </p>
        </div>
      </button>

      {modalOpen && <AppPromoModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
