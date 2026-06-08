"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  Users,
  Building2,
  Info,
  Factory,
  Heart,
  Handshake,
  MapPin,
  ImagePlus,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "../../lib/hooks/useAuth";
import { createClient } from "../../lib/supabase/client";

const STORAGE_PREFIX = "pp_onboarding_v3_";
const PAD = 8;

const DISTRICTS = [
  { value: "all", label: "Прилеп (општо)" },
  { value: "Center", label: "Центар" },
  { value: "Točila", label: "Точила" },
  { value: "Varoš", label: "Варош" },
  { value: "Trizla", label: "Тризла" },
  { value: "Rid", label: "Рид" },
  { value: "Tipski", label: "Типски" },
  { value: "Boncejca", label: "Бончејца" },
];

function districtLabel(v: string) {
  return DISTRICTS.find((d) => d.value === v)?.label ?? "Прилеп";
}

type SpotStep = {
  selector: string;
  fallback?: string; // used when the primary target isn't visible (mobile)
  isHamburger?: boolean; // the "open the menu" step — user taps ☰ to proceed
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: string;
};

const SPOTLIGHT: SpotStep[] = [
  {
    selector: '[data-tour="notifications"]',
    icon: Bell,
    title: "Известувања по твоја мерка",
    body: "Вклучи што сакаш да следиш — нови пријави во твојата населба, иницијативи, итни комунални известувања или дневен е-маил.",
  },
  {
    selector: '[data-tour="menu"]',
    isHamburger: true,
    icon: Menu,
    title: "Отвори го менито",
    body: "Кликни на ☰ горе десно за да го отвориш менито со сите делови на апликацијата. (Или притисни „Следно“ и ние ќе го отвориме.)",
  },
  {
    selector: '[data-tour="menu-citizens"]',
    fallback: '[data-tour="menu"]',
    icon: Users,
    title: "Граѓани",
    body: "Сè за граѓаните: пријави проблем, мапа на пријави, херои на заедницата, иницијативи и населби.",
  },
  {
    selector: '[data-tour="menu-platform"]',
    fallback: '[data-tour="menu"]',
    icon: Building2,
    title: "За платформата",
    body: "Дознај кои сме, нашите проекти за градот и партнерите што ја поддржуваат заедницата.",
  },
  {
    selector: '[data-tour="menu-info"]',
    fallback: '[data-tour="menu"]',
    icon: Info,
    title: "Информации",
    body: "Позитивни вести од Прилеп и календар со настани и случувања во градот.",
  },
  {
    selector: '[data-tour="menu-enterprise"]',
    fallback: '[data-tour="menu"]',
    icon: Factory,
    title: "Локални претпријатија",
    body: "Сите комунални служби на едно место: Водовод (сметки и исправност на водата), Комуналец (отпад и фактури), Осветлување, Градски превоз (линии и мапа), Паркинзи и Градинки.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function getScrollParent(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p) {
    const s = getComputedStyle(p);
    if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) return p;
    p = p.parentElement;
  }
  return null;
}

// Scroll the element's actual scroll container (the <main> feed, or the mobile
// menu drawer) so the target sits just below the container's top edge. More
// reliable than scrollIntoView, which can pick the wrong ancestor.
function scrollToTarget(el: HTMLElement) {
  const sp = getScrollParent(el);
  if (!sp) return;
  const spTop = sp.getBoundingClientRect().top;
  const top = sp.scrollTop + (el.getBoundingClientRect().top - spTop) - 16;
  sp.scrollTo({ top, behavior: "smooth" });
}

function getVisibleTarget(selector: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return (
    els.find((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      // Must actually intersect the viewport — excludes off-screen elements like
      // the mobile nav drawer (translated -100% when closed).
      if (r.right <= 1 || r.left >= window.innerWidth - 1) return false;
      if (r.bottom <= 1 || r.top >= window.innerHeight - 1) return false;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      return true;
    }) ?? null
  );
}

// Like getVisibleTarget but ignores VERTICAL position: matches a target that is
// in an on-screen container (e.g. the open mobile drawer) even if it's scrolled
// below the fold — so we can scroll the drawer down to it. Still excludes the
// closed drawer (off-screen horizontally) and hidden desktop copies.
function getReachableTarget(selector: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return (
    els.find((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      if (r.right <= 1 || r.left >= window.innerWidth - 1) return false;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      return true;
    }) ?? null
  );
}

export default function OnboardingTour() {
  const { user, profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);

  const [fullName, setFullName] = useState("");
  const [district, setDistrict] = useState("all");
  const [street, setStreet] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const storageKey = user ? `${STORAGE_PREFIX}${user.id}` : null;

  const total = SPOTLIGHT.length + 2; // form + spotlight steps + finale
  const isForm = step === 0;
  const isFinale = step === total - 1;
  const spot = !isForm && !isFinale ? SPOTLIGHT[step - 1] : null;

  // Auto-start once per user, only on /account (where every target lives).
  // Suppressed if the user finished it before — tracked in the DB (cross-device)
  // and mirrored in localStorage (instant, offline).
  useEffect(() => {
    if (!storageKey || pathname !== "/account" || !profile) return;
    if (profile.onboarded) return;
    let seen = false;
    try {
      seen = Boolean(localStorage.getItem(storageKey));
    } catch {
      /* ignore */
    }
    if (seen) return;
    const id = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(id);
  }, [storageKey, pathname, profile]);

  useEffect(() => {
    if (!open) return;
    setFullName(profile?.full_name ?? "");
    setDistrict(profile?.district ?? "all");
    setStreet(profile?.street_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [open, profile]);

  // Drawer state per step: category steps need it open so the highlighted
  // section is visible; the hamburger step needs it closed so the user can tap
  // ☰ themselves; everything else (notifications/form/finale) closes it.
  useEffect(() => {
    if (!open) return;
    const isCategory = Boolean(spot?.fallback) && !spot?.isHamburger;
    window.dispatchEvent(
      new CustomEvent(isCategory ? "pp:open-mobile-menu" : "pp:close-mobile-menu"),
    );
  }, [open, step, spot]);

  // Hamburger step: wait for the menu to actually open (the user taps ☰, or the
  // Next button opens it for them) then move on to the categories. On desktop
  // the categories are always visible, so this advances immediately — skipping
  // the "open the menu" step where it doesn't apply.
  useEffect(() => {
    if (!open || !spot?.isHamburger) return;
    // Desktop has no drawer — categories are always visible, so skip this step.
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setStep((s) => s + 1);
      return;
    }
    // Only advance once the drawer OPENS — i.e. require it to be observed closed
    // first. This lets back-navigation land here (the drawer closes on entry)
    // without instantly bouncing forward again.
    let wasClosed = false;
    const id = setInterval(() => {
      const visible = Boolean(getVisibleTarget('[data-tour="menu-citizens"]'));
      if (!visible) {
        wasClosed = true;
      } else if (wasClosed) {
        clearInterval(id);
        setStep((s) => s + 1);
      }
    }, 180);
    return () => clearInterval(id);
  }, [open, step, spot]);

  // Track the spotlight target rect
  useEffect(() => {
    if (!open || !spot) {
      setRect(null);
      return;
    }
    const resolve = (): { el: HTMLElement | null; fallback: boolean } => {
      const primary = getVisibleTarget(spot.selector);
      if (primary) return { el: primary, fallback: false };
      // In the open drawer but scrolled below the fold → still the real target;
      // scrollToTarget will bring it into view.
      const reachable = getReachableTarget(spot.selector);
      if (reachable) return { el: reachable, fallback: false };
      const fb = spot.fallback ? getVisibleTarget(spot.fallback) : null;
      return { el: fb, fallback: Boolean(fb) };
    };

    // Scroll the target into its container's view ONCE per step (avoids the
    // janky per-tick re-scrolling). Re-scroll only if the target later drifts far
    // down — e.g. the notifications panel loads its feed async and grows taller,
    // pushing itself out of view after the first scroll. Throttled, so no jank.
    const stepStartedAt = Date.now();
    let scrolledEl: HTMLElement | null = null;
    let lastScrollAt = 0;
    const measure = () => {
      const { el, fallback } = resolve();
      setFallbackActive(fallback);
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      if (!fallback) {
        const isNewTarget = scrolledEl !== el;
        const driftedDown =
          r.top > 260 && Date.now() - stepStartedAt < 3000 && Date.now() - lastScrollAt > 700;
        if (isNewTarget || driftedDown) {
          scrolledEl = el;
          lastScrollAt = Date.now();
          scrollToTarget(el);
        }
      }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const t = setTimeout(measure, 60);
    // Re-measure continuously: when the drawer opens the real menu section
    // becomes visible and the spotlight jumps from the hamburger fallback onto
    // it (and back if it closes). Cheap and DOM-change proof.
    const interval = setInterval(measure, 200);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, step, spot]);

  function finish() {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    // Persist to the profile so it stays dismissed across devices/browsers.
    if (user) {
      supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
    }
  }

  function goTo(href: string) {
    finish();
    router.push(href);
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) return toast.error("Избери слика (jpg/png/webp)");
    if (file.size > 8 * 1024 * 1024) return toast.error("Сликата е преголема (макс 8MB)");
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    for (const bucket of ["avatars", "issue-photos"] as const) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { contentType: file.type, upsert: true });
      if (error) continue;
      setAvatarUrl(supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl);
      setUploading(false);
      toast.success("Сликата е поставена");
      return;
    }
    setUploading(false);
    toast.error("Неуспешно прикачување на сликата");
  }

  async function saveAndContinue() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        street_name: street.trim() || null,
        district: district === "all" ? null : district,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    window.dispatchEvent(
      new CustomEvent("account-settings-changed", { detail: { primaryDistrict: district } }),
    );
    setStep(1);
  }

  if (!open) return null;

  const isLast = isFinale;
  const initial = (fullName || profile?.full_name || user?.email || "?").trim().charAt(0).toUpperCase();

  const Dots = (
    <div className="flex shrink-0 items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1 rounded-full transition-all ${
            i === step ? "w-3.5 bg-primary" : "w-1 bg-zinc-300"
          }`}
        />
      ))}
    </div>
  );

  // Reusable avatar preview circle
  const AvatarBig = (
    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-theme-ink text-2xl font-bold text-white ring-4 ring-white/60">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[120]" style={{ pointerEvents: isForm || isFinale ? "auto" : "none" }}>
      {/* Overlay */}
      {isForm || isFinale || !rect ? (
        <div className="absolute inset-0 bg-black/60" />
      ) : (
        (() => {
          const vw = typeof window !== "undefined" ? window.innerWidth : rect.left + rect.width;
          let top = rect.top - PAD;
          let left = rect.left - PAD;
          let width = rect.width + PAD * 2;
          let height = rect.height + PAD * 2;

          const squareOnHamburger = fallbackActive || spot?.isHamburger;
          if (squareOnHamburger) {
            // Hamburger target: tight square centred on the icon.
            const side = Math.max(rect.width, rect.height) + 2;
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            left = cx - side / 2;
            top = cy - side / 2;
            width = side;
            height = side;
          } else if (spot?.fallback) {
            // Menu category sections: hug tighter horizontally (~7px less per side).
            const padX = 1;
            left = rect.left - padX;
            width = rect.width + padX * 2;
          }

          // Keep the right edge on-screen.
          const right = Math.min(left + width, vw - 4);
          width = Math.max(right - left, 0);

          return (
            <div
              style={{
                position: "fixed",
                top,
                left,
                width,
                height,
                borderRadius: squareOnHamburger ? 12 : 14,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
                transition: "all 0.25s ease",
                pointerEvents: "none",
              }}
            />
          );
        })()
      )}

      {/* ── Step 1: profile form ── */}
      {isForm && (
        <div className="absolute inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl lg:max-w-3xl"
            style={{ pointerEvents: "auto" }}>
            <div className="lg:flex">
              {/* Live preview — desktop only */}
              <div className="hidden flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1b837a] to-[#46c8bb] p-8 text-center text-white lg:flex lg:w-[40%]">
                {AvatarBig}
                <div>
                  <p className="text-lg font-bold">{fullName || "Твоето име"}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-white/85">
                    <MapPin size={13} /> {districtLabel(district)}
                    {street ? ` · ${street}` : ""}
                  </p>
                  {user?.email && <p className="mt-1 text-xs text-white/70">{user.email}</p>}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/75">
                  Вака ќе изгледа твојот профил во заедницата.
                </p>
              </div>

              {/* Form */}
              <div className="lg:flex-1">
                <div className="relative px-6 pt-7">
                  <button
                    onClick={finish}
                    aria-label="Затвори"
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100">
                    <X size={18} />
                  </button>
                  <h2 className="text-xl font-bold tracking-tight text-theme-heading">
                    Добредојде! Ајде да те запознаеме 👋
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-theme-muted">
                    Кажи ни каде живееш за да ти праќаме само известувања што се важни за тебе —
                    проблеми и итни вести од твоето маало.
                  </p>
                </div>

                <div className="space-y-4 px-6 py-5">
                  {/* Avatar (mobile shows small inline) */}
                  <div className="flex items-center gap-3 lg:hidden">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-theme-ink text-lg font-bold text-white">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initial
                      )}
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-zinc-50">
                      <ImagePlus size={15} className="text-zinc-500" />
                      {uploading ? "Се прикачува…" : avatarUrl ? "Промени слика" : "Додади слика"}
                      <input type="file" accept="image/*" className="hidden" disabled={uploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
                    </label>
                  </div>
                  <label className="hidden cursor-pointer items-center gap-2 lg:inline-flex">
                    <span className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-zinc-50">
                      <ImagePlus size={15} className="text-zinc-500" />
                      {uploading ? "Се прикачува…" : avatarUrl ? "Промени слика" : "Додади профилна слика"}
                    </span>
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
                  </label>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-theme-subtle">
                      Име и презиме
                    </label>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder="пр. Ана Стоянова"
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-theme-subtle">
                      Примарна населба
                    </label>
                    <select value={district} onChange={(e) => setDistrict(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                      {DISTRICTS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] leading-snug text-zinc-400">
                      Така добиваш известувања за нови проблеми пријавени во твојата населба.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-theme-subtle">
                      Улица <span className="font-normal normal-case text-zinc-400">(препорачано)</span>
                    </label>
                    <input value={street} onChange={(e) => setStreet(e.target.value)}
                      placeholder="пр. ул. Партизанска"
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    <p className="mt-1 text-[11px] leading-snug text-zinc-400">
                      Важно за итни известувања од локалните претпријатија (вода, струја, комуналец) за твојата улица.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-4 py-4 sm:px-6">
                  {Dots}
                  <div className="flex items-center gap-1.5">
                    <button onClick={finish}
                      className="shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium text-theme-muted hover:bg-zinc-100">
                      Прескокни
                    </button>
                    <button onClick={saveAndContinue} disabled={saving || uploading}
                      className="shrink-0 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60">
                      {saving ? "Се зачувува…" : "Зачувај и продолжи"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Spotlight steps ── */}
      {spot && (
        <div className="fixed inset-x-0 bottom-0 flex justify-center p-3 sm:p-4" style={{ pointerEvents: "none" }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" style={{ pointerEvents: "auto" }}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                <spot.icon size={20} className="text-primary" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-theme-heading">{spot.title}</h3>
                {fallbackActive && (
                  <p className="mt-0.5 text-[11px] font-semibold text-primary">
                    👆 Отвори го менито ☰ за да го видиш овој дел
                  </p>
                )}
                <p className="mt-1 text-xs leading-relaxed text-theme-muted">{spot.body}</p>
              </div>
              <button onClick={finish} aria-label="Затвори"
                className="ml-auto shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              {Dots}
              <div className="flex items-center gap-2">
                <button onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-theme-muted hover:bg-zinc-100">
                  <ChevronLeft size={15} /> Назад
                </button>
                <button onClick={() => setStep((s) => s + 1)}
                  className="rounded-lg bg-theme-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                  Следно
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Finale: about + member/sponsor ── */}
      {isFinale && (
        <div className="absolute inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl"
            style={{ pointerEvents: "auto" }}>
            <div className="relative flex flex-col items-center gap-3 px-6 pt-8 text-center">
              <button onClick={finish} aria-label="Затвори"
                className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100">
                <X size={18} />
              </button>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <Heart size={26} className="text-primary" />
              </span>
              <h2 className="text-lg font-bold text-theme-heading">Биди дел од заедницата 💙</h2>
              <p className="text-sm leading-relaxed text-theme-muted">
                Мој Прилеп е заедничка платформа. Дознај повеќе за нас, или поддржи нè како член
                или спонзор и помогни градот да расте.
              </p>
            </div>

            <div className="space-y-2 px-6 pt-5">
              <button onClick={() => goTo("/about")}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-theme-heading transition hover:bg-zinc-50">
                <Info size={16} className="text-zinc-500" /> За нас
              </button>
              <button onClick={() => goTo("/sponsors")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90">
                <Handshake size={16} /> Стани член или спонзор
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-100 px-6 py-4">
              {Dots}
              <div className="flex items-center gap-2">
                <button onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-theme-muted hover:bg-zinc-100">
                  <ChevronLeft size={15} /> Назад
                </button>
                <button onClick={finish}
                  className="rounded-lg bg-theme-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                  Заврши
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
