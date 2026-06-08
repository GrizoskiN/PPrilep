"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/hooks/useAuth";

const KEY = "pp_signup_redirect";
const TTL = 10 * 60 * 1000; // 10 min — only honour a fresh signup intent

/**
 * After a new signup the register page sets a localStorage flag (it survives the
 * OAuth round-trip). Once the user is signed in we send them to /account — where
 * the onboarding tour kicks in — regardless of whether Supabase preserved the
 * `next` redirect param. One-shot and time-limited so it never hijacks a normal
 * login later on.
 */
export default function PostAuthRedirect() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;
    let ts: number | null = null;
    try {
      const v = localStorage.getItem(KEY);
      ts = v ? Number(v) : null;
    } catch {
      /* ignore */
    }
    if (!ts) return;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    if (Date.now() - ts > TTL) return;
    if (pathname !== "/account") router.replace("/account");
  }, [user, pathname, router]);

  return null;
}
