/**
 * Pure data-layer for issue detail loads.
 *
 * Why this file exists:
 *   - These functions take a Supabase client as input (dependency-injected)
 *     instead of importing `lib/supabase/client.ts` directly.
 *   - That means a React Native app can call them with its own native
 *     Supabase client (with AsyncStorage etc.) — no code duplication.
 *   - No React, no state, no browser APIs in here. Just queries.
 *
 * Used by:
 *   - components/issues/IssueDetail.tsx (web)
 *   - future: apps/mobile/screens/IssueDetail.tsx (React Native)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface IssueComment {
  id: number;
  user_id: string;
  body: string;
  parent_comment_id?: number | null;
  created_at?: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    membership_tier?: string | null;
    points?: number;
  } | null;
}

export interface HelpOfferComment {
  id: number;
  offer_id: number;
  user_id: string;
  body: string;
  created_at?: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    membership_tier?: string | null;
    points?: number;
  } | null;
}

export interface HelpOffer {
  id: number;
  issue_id: number;
  user_id: string;
  note: string | null;
  service_date: string | null;
  created_at?: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    membership_tier?: string | null;
    points?: number;
  } | null;
  vote_count: number;
  voted_by_me: boolean;
  comments: HelpOfferComment[];
}

export type PeopleUser = {
  user_id: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    membership_tier?: string | null;
    points?: number;
  } | null;
};

export type ChangeRequest = {
  id: number;
  issue_id: number;
  requester_user_id: string;
  type: "status_change";
  payload: {
    status: "progress" | "resolved";
    description: string;
    after_photo_url?: string | null;
  };
  status: "pending" | "approved" | "rejected";
  created_at?: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    membership_tier?: string | null;
    points?: number;
  } | null;
};

export type ResolverInfo = {
  resolver: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    membership_tier?: string | null;
    points?: number;
  } | null;
  upvote_count: number;
  has_upvoted: boolean;
};

// Internal types for raw query rows where profiles can come back as
// either a single row or an array depending on the Postgrest join.
type ProfileShape = {
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  membership_tier?: string | null;
  points?: number;
};
type MaybeArrayProfile = ProfileShape | ProfileShape[] | null;

function flattenProfile(p: MaybeArrayProfile): ProfileShape | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

// ── Comments ─────────────────────────────────────────────────────────────────

export type IssueCommentsResult =
  | { ok: true; comments: IssueComment[]; likeCounts: Record<number, number>; likedComments: Set<number> }
  | { ok: false; tableMissing: boolean; error: { code?: string; message: string } };

export async function fetchIssueComments(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  issueId: number,
  userId: string | undefined,
): Promise<IssueCommentsResult> {
  const { data, error } = await supabase
    .from("issue_comments")
    .select(
      "id, user_id, body, photo_url, parent_comment_id, created_at, profiles:user_id(full_name, avatar_url, username, membership_tier, points)",
    )
    .eq("issue_id", issueId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      tableMissing: error.code === "42P01",
      error: { code: error.code, message: error.message },
    };
  }

  const comments: IssueComment[] = (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    body: row.body,
    parent_comment_id: (row as { parent_comment_id?: number | null }).parent_comment_id ?? null,
    created_at: (row as { created_at?: string }).created_at,
    profiles: flattenProfile((row as { profiles?: MaybeArrayProfile }).profiles ?? null),
  }));

  const commentIds = comments.map((c) => c.id);
  const likeCounts: Record<number, number> = {};
  const likedComments = new Set<number>();

  if (commentIds.length > 0) {
    const [{ data: likeRows }, { data: myLikeRows }] = await Promise.all([
      supabase.from("comment_likes").select("comment_id").in("comment_id", commentIds),
      userId
        ? supabase.from("comment_likes").select("comment_id").eq("user_id", userId).in("comment_id", commentIds)
        : Promise.resolve({ data: [] as { comment_id: number }[] }),
    ]);
    for (const row of (likeRows ?? []) as { comment_id: number }[]) {
      likeCounts[row.comment_id] = (likeCounts[row.comment_id] ?? 0) + 1;
    }
    for (const row of (myLikeRows ?? []) as { comment_id: number }[]) {
      likedComments.add(row.comment_id);
    }
  }

  return { ok: true, comments, likeCounts, likedComments };
}

// ── People stats (affected + helpers) ────────────────────────────────────────

export type PeopleStatsResult = {
  affected: PeopleUser[];
  helpers: PeopleUser[];
};

export async function fetchIssuePeopleStats(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  issueId: number,
): Promise<PeopleStatsResult> {
  const [{ data: affected }, { data: helpers }] = await Promise.all([
    supabase
      .from("issue_affected")
      .select("user_id, profiles:user_id(full_name, avatar_url, username, membership_tier, points)")
      .eq("issue_id", issueId),
    supabase
      .from("issue_helpers")
      .select("user_id, profiles:user_id(full_name, avatar_url, username, membership_tier, points)")
      .eq("issue_id", issueId),
  ]);

  return {
    affected: (affected ?? []).map((r) => ({
      user_id: r.user_id,
      profiles: flattenProfile((r as { profiles?: MaybeArrayProfile }).profiles ?? null),
    })),
    helpers: (helpers ?? []).map((r) => ({
      user_id: r.user_id,
      profiles: flattenProfile((r as { profiles?: MaybeArrayProfile }).profiles ?? null),
    })),
  };
}

// ── Change requests (RPC) ────────────────────────────────────────────────────

export async function fetchIssueChangeRequests(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  issueId: number,
): Promise<{ ok: true; requests: ChangeRequest[] } | { ok: false; error: { code?: string; message: string } }> {
  const { data, error } = await supabase.rpc("get_pending_change_requests", {
    p_issue_id: issueId,
  });
  if (error) {
    return { ok: false, error: { code: error.code, message: error.message } };
  }
  return { ok: true, requests: (data ?? []) as ChangeRequest[] };
}

// ── Resolver info (RPC) ──────────────────────────────────────────────────────

export async function fetchIssueResolverInfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  issueId: number,
): Promise<ResolverInfo | null> {
  const { data, error } = await supabase.rpc("get_resolver_info", {
    p_issue_id: issueId,
  });
  if (error || !data) return null;
  const row = (Array.isArray(data) ? data[0] : data) as ResolverInfo | undefined;
  if (!row) return null;
  return {
    resolver: row.resolver ?? null,
    upvote_count: row.upvote_count ?? 0,
    has_upvoted: Boolean(row.has_upvoted),
  };
}

// ── Help offers + their votes + their comments ──────────────────────────────

export type HelpOffersResult =
  | { ok: true; offers: HelpOffer[] }
  | { ok: false; tableMissing: boolean; error: { code?: string; message: string } };

export async function fetchIssueHelpOffers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  issueId: number,
  userId: string | undefined,
): Promise<HelpOffersResult> {
  const { data: offersData, error: offersError } = await supabase
    .from("issue_help_offers")
    .select(
      "id, issue_id, user_id, note, service_date, created_at, profiles:user_id(full_name, avatar_url, username, membership_tier, points)",
    )
    .eq("issue_id", issueId)
    .order("created_at", { ascending: true });

  if (offersError) {
    return {
      ok: false,
      tableMissing: offersError.code === "42P01",
      error: { code: offersError.code, message: offersError.message },
    };
  }

  type RawOffer = {
    id: number;
    issue_id: number;
    user_id: string;
    note: string | null;
    service_date: string | null;
    created_at?: string;
    profiles?: MaybeArrayProfile;
  };
  type RawComment = {
    id: number;
    offer_id: number;
    user_id: string;
    body: string;
    created_at?: string;
    profiles?: MaybeArrayProfile;
  };

  const offers = (offersData ?? []) as RawOffer[];
  const offerIds = offers.map((o) => o.id);

  let voteRows: Array<{ offer_id: number; user_id: string }> = [];
  let offerCommentRows: HelpOfferComment[] = [];

  if (offerIds.length > 0) {
    const [{ data: votesData }, { data: commentsData }] = await Promise.all([
      supabase.from("issue_help_date_votes").select("offer_id, user_id").in("offer_id", offerIds),
      supabase
        .from("issue_help_offer_comments")
        .select(
          "id, offer_id, user_id, body, created_at, profiles:user_id(full_name, avatar_url, username, membership_tier, points)",
        )
        .in("offer_id", offerIds)
        .order("created_at", { ascending: true }),
    ]);
    voteRows = (votesData ?? []) as Array<{ offer_id: number; user_id: string }>;
    offerCommentRows = ((commentsData ?? []) as RawComment[]).map((c) => ({
      id: c.id,
      offer_id: c.offer_id,
      user_id: c.user_id,
      body: c.body,
      created_at: c.created_at,
      profiles: flattenProfile(c.profiles ?? null),
    }));
  }

  const voteCountByOffer: Record<number, number> = {};
  const votedByMe = new Set<number>();
  for (const v of voteRows) {
    voteCountByOffer[v.offer_id] = (voteCountByOffer[v.offer_id] ?? 0) + 1;
    if (userId && v.user_id === userId) votedByMe.add(v.offer_id);
  }

  const commentsByOffer: Record<number, HelpOfferComment[]> = {};
  for (const c of offerCommentRows) {
    commentsByOffer[c.offer_id] = commentsByOffer[c.offer_id] ?? [];
    commentsByOffer[c.offer_id].push(c);
  }

  const offers_: HelpOffer[] = offers.map((offer) => ({
    id: offer.id,
    issue_id: offer.issue_id,
    user_id: offer.user_id,
    note: offer.note,
    service_date: offer.service_date,
    created_at: offer.created_at,
    profiles: flattenProfile(offer.profiles ?? null),
    vote_count: voteCountByOffer[offer.id] ?? 0,
    voted_by_me: votedByMe.has(offer.id) || offer.user_id === userId,
    comments: commentsByOffer[offer.id] ?? [],
  }));

  return { ok: true, offers: offers_ };
}
