"use client";

// Cloudflare Turnstile CAPTCHA widget — DORMANT BY DEFAULT.
//
// Behaviour is controlled entirely by NEXT_PUBLIC_TURNSTILE_SITE_KEY:
//   • unset  → `turnstileEnabled` is false, the component renders nothing, and
//              callers pass `captchaToken: undefined`. Zero behaviour change.
//              This is the launch state.
//   • set    → the widget renders, solves, and feeds a token back via onToken.
//              Pair it with "Enable Captcha protection" in the Supabase
//              dashboard (Auth → Attack Protection) using the matching SECRET.
//
// Because NEXT_PUBLIC_* vars are inlined at build time, setting the key in
// Vercel requires a redeploy before the widget activates.

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** True only when a site key is configured. Use to gate submit buttons.
 *
 * Note: CAPTCHA cannot be disabled per-environment, because Supabase's "Enable
 * Captcha protection" rejects every tokenless auth request project-wide. To work
 * on localhost, add `localhost`/`127.0.0.1` to this widget's allowed hostnames
 * in the Cloudflare Turnstile dashboard so the widget can solve and produce a
 * valid token. */
export const turnstileEnabled = !!SITE_KEY;

export interface TurnstileHandle {
  /** Discard the current token and request a fresh one (tokens are single-use). */
  reset: () => void;
}

interface Props {
  /** Receives the solved token, or null when it expires / errors. */
  onToken: (token: string | null) => void;
  className?: string;
}

// ── Cloudflare global + one-time script loader ──────────────────────────────
interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

const TurnstileWidget = forwardRef<TurnstileHandle, Props>(
  function TurnstileWidget({ onToken, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    // Keep the latest callback in a ref so the render effect runs exactly once
    // (avoids re-rendering the widget when the parent passes an inline fn).
    const onTokenRef = useRef(onToken);
    onTokenRef.current = onToken;

    useImperativeHandle(
      ref,
      () => ({
        reset() {
          if (window.turnstile && widgetIdRef.current) {
            window.turnstile.reset(widgetIdRef.current);
            onTokenRef.current(null);
          }
        },
      }),
      [],
    );

    useEffect(() => {
      if (!SITE_KEY) return;
      let cancelled = false;

      loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;
          if (widgetIdRef.current) return; // already rendered
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: SITE_KEY,
            callback: (token: string) => onTokenRef.current(token),
            "expired-callback": () => onTokenRef.current(null),
            "error-callback": () => onTokenRef.current(null),
          });
        })
        .catch(() => {
          // Script blocked (aggressive ad-blocker). Leave token null — the
          // submit stays gated, and Google OAuth remains as a fallback path.
        });

      return () => {
        cancelled = true;
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            /* ignore */
          }
          widgetIdRef.current = null;
        }
      };
    }, []);

    if (!SITE_KEY) return null;
    return <div ref={containerRef} className={className} />;
  },
);

export default TurnstileWidget;
