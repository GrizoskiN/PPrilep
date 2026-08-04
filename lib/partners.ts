/**
 * Business partners come from two places and render as one list.
 *
 *  1. `profiles` rows with a company `membership_tier` — businesses that signed
 *     up and applied.
 *  2. `partners` rows — businesses entered by hand that never applied and have
 *     no account. `profiles` cannot hold them: profiles.id is FK'd to
 *     auth.users, so a profile without a login is not representable.
 *
 * Both collapse into `PartnerCard` so the UI never branches on origin.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { userPath } from "./utils";

export const COMPANY_TIERS = [
  "company_basic",
  "company_preferred",
  "company_premium",
] as const;

/** Premium first. Unknown/absent tiers sort last. */
const TIER_RANK: Record<string, number> = {
  company_premium: 0,
  company_preferred: 1,
  company_basic: 2,
};

export interface ManualPartner {
  id: number;
  name: string;
  tier: string;
  logo_url: string | null;
  website: string | null;
  phone: string | null;
  note: string | null;
  is_active: boolean;
  sort: number;
}

/** One partner, whatever its origin. */
export interface PartnerCard {
  /** Unique across both sources — ids can collide, so they're namespaced. */
  key: string;
  name: string;
  tier: string | null;
  avatarUrl: string | null;
  username: string | null;
  /** Where the card links, or null if it links nowhere. */
  href: string | null;
  /** True when `href` leaves the site (a manual partner's own website). */
  external: boolean;
  points: number;
  sort: number;
}

type ProfilePartner = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  membership_tier: string | null;
  points: number;
};

export function profileToCard(m: ProfilePartner): PartnerCard {
  return {
    key: `p:${m.id}`,
    name: m.full_name ?? m.username ?? "Компанија",
    tier: m.membership_tier,
    avatarUrl: m.avatar_url,
    username: m.username,
    href: userPath(m.username, m.id),
    external: false,
    points: m.points ?? 0,
    sort: 0,
  };
}

export function manualToCard(p: ManualPartner): PartnerCard {
  return {
    key: `m:${p.id}`,
    name: p.name,
    tier: p.tier,
    avatarUrl: p.logo_url,
    username: null,
    // No profile page exists for a manual partner, so the card points at the
    // business's own site when there is one, and is inert otherwise.
    href: p.website,
    external: Boolean(p.website),
    points: 0,
    sort: p.sort,
  };
}

/** Fisher-Yates. Returns a new array; the input is untouched. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Tier first, then the explicit `sort` column, then random.
 *
 * The random tail is the point: every list of partners is truncated somewhere —
 * the sidebar shows twelve, the strip shows what fits — and a fixed order means
 * the partners who joined first are the only ones ever seen. Shuffling within a
 * rank rotates that exposure on each page load, while paid tiers still outrank
 * free ones and a hand-set `sort` still pins a partner in place.
 *
 * Array.prototype.sort is stable, so the shuffled order survives as the
 * tiebreaker. Call this once per fetch, not per render, or the cards reshuffle
 * under the reader.
 */
export function sortPartnerCards(cards: PartnerCard[]): PartnerCard[] {
  return shuffle(cards).sort(
    (a, b) =>
      (TIER_RANK[a.tier ?? ""] ?? 9) - (TIER_RANK[b.tier ?? ""] ?? 9) ||
      a.sort - b.sort,
  );
}

/**
 * Active manual partners. RLS already hides inactive rows from non-admins, so
 * the explicit filter is for admins, who can see everything.
 */
export async function fetchManualPartners(
  supabase: SupabaseClient,
): Promise<ManualPartner[]> {
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("is_active", true)
    .order("sort", { ascending: true });
  // An empty partner list and a failed query look identical on screen, which is
  // exactly the confusion worth avoiding — a silent [] here reads as "no
  // partners yet". Never throw (a broken sidebar is worse than a bare one), but
  // never hide it either.
  if (error) console.error("[partners] fetch failed:", error.message);
  return (data as ManualPartner[] | null) ?? [];
}
