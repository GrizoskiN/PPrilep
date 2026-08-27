"use client";

/**
 * "Следи не" — follow a club to get a push when it posts.
 *
 * A client component for the same reason as OwnerBar: the profile HTML is cached
 * for an hour and shared by everyone, so whether *you* follow can't be baked in.
 * It asks /api/sport/follow after mount, then toggles optimistically. A guest who
 * taps it is sent to login with a redirect back to this profile.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";

export default function FollowButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/sport/follow?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setAuthed(d.authed === true);
        setFollowing(d.following === true);
        setReady(true);
      })
      .catch(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  async function toggle() {
    if (!authed) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/sport/${slug}`)}`);
      return;
    }
    if (busy) return;
    const next = !following;
    setFollowing(next); // optimistic
    setBusy(true);
    try {
      const res = await fetch(`/api/sport/follow?slug=${encodeURIComponent(slug)}`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) setFollowing(!next); // revert on failure
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  // Reserve the space while loading so the header doesn't jump.
  if (!ready) {
    return <span className="h-9 w-28 shrink-0 animate-pulse rounded-full bg-zinc-100" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:opacity-70 ${
        following
          ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200 hover:bg-teal-100"
          : "bg-teal-600 text-white hover:bg-teal-700"
      }`}
    >
      {following ? (
        <>
          <Check className="h-4 w-4" />
          Следиш
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Следи не
        </>
      )}
    </button>
  );
}
