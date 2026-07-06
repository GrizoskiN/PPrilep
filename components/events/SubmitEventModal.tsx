"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import EventSubmitForm from "./EventSubmitForm";

interface Props {
  userEmail?: string;
  userName?: string;
  onClose: () => void;
}

/**
 * Standalone shell for the "пријави настан" wizard. Bottom sheet on mobile,
 * centered card on desktop. Mirrors SubmitStoryModal (Позитива) verbatim.
 */
export default function SubmitEventModal({ userEmail, userName, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [swipeDy, setSwipeDy] = useState(0);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSwipeDy(0);
    setTimeout(onClose, 280);
  }, [onClose]);

  useEffect(() => {
    const el = dragHandleRef.current;
    if (!el) return;
    let startY = 0, dragging = false, currentDy = 0;
    function onStart(e: TouchEvent) { startY = e.touches[0].clientY; dragging = false; currentDy = 0; }
    function onMove(e: TouchEvent) {
      const dy = e.touches[0].clientY - startY;
      if (!dragging && dy > 8) dragging = true;
      if (dragging) { e.preventDefault(); currentDy = Math.max(0, dy); setSwipeDy(currentDy); }
    }
    function onEnd() {
      if (dragging && currentDy > 80) handleClose();
      else if (dragging) setSwipeDy(0);
      dragging = false; currentDy = 0;
    }
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [handleClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") handleClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-500"
        style={{ opacity: open ? 1 : 0 }}
        onClick={handleClose}
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div
          className={cn(
            "pointer-events-auto flex w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl",
            swipeDy === 0 && "transition-[transform,opacity] duration-500 ease-out",
          )}
          style={{
            transform: isDesktop
              ? open ? "translateY(0)" : "translateY(-42px)"
              : open ? `translateY(${swipeDy}px)` : "translateY(110%)",
            opacity: isDesktop ? (open ? 1 : 0) : 1,
            height: "85dvh",
            maxHeight: "95dvh",
            borderRadius: isDesktop ? undefined : "1rem 1rem 0 0",
          }}>

          {/* Drag handle — mobile only */}
          <div
            ref={dragHandleRef}
            className="flex shrink-0 cursor-grab touch-none justify-center pb-2 pt-3 active:cursor-grabbing sm:hidden">
            <div className="pointer-events-none h-1.5 w-12 rounded-full bg-zinc-300" />
          </div>

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-light text-base">
                📅
              </span>
              <h2 className="text-base font-semibold text-zinc-900">Пријави настан</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Затвори"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200">
              <X size={18} />
            </button>
          </div>

          {/* Wizard */}
          <div className="min-h-0 flex-1">
            <EventSubmitForm
              onCancel={handleClose}
              onClose={handleClose}
              userEmail={userEmail}
              userName={userName}
            />
          </div>
        </div>
      </div>
    </>
  );
}
