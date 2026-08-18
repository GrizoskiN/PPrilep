"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../lib/config/appStores";

/**
 * Web dialog explaining that the best experience is in the free native apps,
 * with a QR code for each store so desktop visitors can grab it on their phone.
 */
export default function AppPromoModal({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function close() {
    setOpen(false);
    setTimeout(onClose, 220);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stores = [
    { name: "App Store", sub: "iPhone / iPad", qr: "/qr/app-store.svg", url: APP_STORE_URL },
    { name: "Google Play", sub: "Android", qr: "/qr/play-store.svg", url: PLAY_STORE_URL },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/40 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
        onClick={close}
      />
      <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl bg-theme-surface shadow-2xl transition-[transform,opacity] duration-300 ease-out"
          style={{
            transform: open ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
            opacity: open ? 1 : 0,
          }}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo/app-icon-192.png" alt="Мој Прилеп" className="h-11 w-11 rounded-xl" />
              <div>
                <h2 className="text-base font-semibold text-theme-heading">
                  Најдобро искуство на телефон
                </h2>
                <p className="text-xs text-theme-muted">Бесплатно · Побрзо · Поедноставно</p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Затвори"
              className="-mr-1 shrink-0 rounded-full p-1.5 text-theme-muted hover:bg-theme-surface-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="px-5 pt-3 text-[13px] leading-relaxed text-theme-body">
            Мој Прилеп е најдобра како мобилна апликација — работи побрзо, со известувања во
            живо и следење на автобусите. Скенирај го кодот со камерата на телефонот за да ја
            инсталираш бесплатно.
          </p>

          {/* QR codes */}
          <div className="grid grid-cols-2 gap-3 p-5">
            {stores.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-2xl border border-theme p-3 transition-colors hover:bg-theme-surface-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.qr}
                  alt={`QR за ${s.name}`}
                  className="h-32 w-32 rounded-lg bg-white p-1.5"
                />
                <div className="text-center">
                  <p className="text-sm font-semibold text-theme-heading">{s.name}</p>
                  <p className="text-[11px] text-theme-muted">{s.sub}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
