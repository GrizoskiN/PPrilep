"use client";

/**
 * AuthContext — single source of truth for authentication state.
 *
 * Previously every component that needed auth data called `useAuth()` which
 * internally called `supabase.auth.getSession()` and registered an
 * `onAuthStateChange` listener.  With 9+ components using the hook on a single
 * page that meant 9 simultaneous auth requests and 9 active listeners — the
 * primary reason the app felt slow.
 *
 * Now the provider runs the auth logic exactly once at the `(main)` layout level
 * and all consumers read the same state via `useContext`.  The `useAuth()` hook
 * in `lib/hooks/useAuth.ts` delegates here automatically — no import changes
 * needed in any component.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "../supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "../types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  /** True while the initial session check is in flight. */
  loading: boolean;
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const metaAvatar = authUser?.user_metadata?.avatar_url ?? null;
      const metaName =
        authUser?.user_metadata?.full_name ??
        authUser?.user_metadata?.name ??
        null;
      const emailPrefix =
        authUser?.email
          ?.split("@")[0]
          ?.replace(/[^a-z0-9._-]/gi, "") ?? null;

      if (error && error.code === "PGRST116") {
        // Profile row missing — create it
        await supabase.from("profiles").upsert({
          id: userId,
          full_name: metaName,
          avatar_url: metaAvatar,
          username: emailPrefix,
        });
        const { data: created } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        setProfile(created);
      } else {
        // Sync missing fields from OAuth metadata
        const updates: Record<string, string> = {};
        if (data && !data.avatar_url && metaAvatar)
          updates.avatar_url = metaAvatar;
        if (data && !data.full_name && metaName) updates.full_name = metaName;
        if (data && !data.username && emailPrefix)
          updates.username = emailPrefix;

        if (data && Object.keys(updates).length > 0) {
          await supabase.from("profiles").update(updates).eq("id", userId);
          setProfile({ ...data, ...updates });
        } else {
          setProfile(data);
        }
      }

      setLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for sign-in / sign-out
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Read auth state from the nearest AuthProvider. */
export function useAuthContext(): AuthState {
  return useContext(AuthContext);
}
