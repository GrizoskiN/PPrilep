"use client";

// Thin wrapper around <TurnstileWidget> that bundles the token state, a reset
// handle, and the rendered widget element into one hook — so each auth form is
// a 3-line change. Dormant when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset.
//
// Usage:
//   const captcha = useTurnstile();
//   ...
//   {captcha.widget}
//   <button disabled={!captcha.ready}>Submit</button>
//   ...
//   await supabase.auth.signUp({ ..., options: { captchaToken: captcha.token ?? undefined } });
//   if (error) captcha.reset();   // tokens are single-use — refresh after a failed attempt

import { useCallback, useRef, useState } from "react";
import TurnstileWidget, {
  turnstileEnabled,
  type TurnstileHandle,
} from "../../components/auth/TurnstileWidget";

export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const ref = useRef<TurnstileHandle>(null);

  const reset = useCallback(() => {
    ref.current?.reset();
    setToken(null);
  }, []);

  const widget = (
    <TurnstileWidget ref={ref} onToken={setToken} className="my-1" />
  );

  return {
    /** Whether a site key is configured (i.e. CAPTCHA is armed). */
    enabled: turnstileEnabled,
    /** The current solved token, or null. */
    token,
    /** True when it's safe to submit: either CAPTCHA is off, or a token exists. */
    ready: !turnstileEnabled || !!token,
    /** Discard the token and request a fresh one (call after a failed attempt). */
    reset,
    /** Render this where the widget should appear (renders nothing when off). */
    widget,
  };
}
