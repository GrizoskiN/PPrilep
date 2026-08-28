/**
 * Owner push — one notification to the account that submitted a club, the first
 * time that club is published (i.e. an editor approves it from the review queue).
 *
 * Runs from /api/revalidate on publish of a `sportClub` (the Sanity plan's two
 * webhook slots are both taken, so the revalidate hook is where sport pushes
 * live). Addressed, not broadcast: it reaches only the submitter's devices.
 *
 * Idempotent: the club's id is claimed once in push_broadcasts (namespaced
 * `clubApproved:<_id>` so it never collides with an event's bare id or a
 * sportPost claim), so every later edit of the club is a no-op and the owner is
 * congratulated exactly once — on approval, never again.
 *
 * Best-effort by contract: any problem here is logged and swallowed so it can
 * never fail the revalidation. A club with no submitter (e.g. one an admin
 * created directly in Studio) simply has nobody to notify and is skipped.
 */
import { fetchSportClubFresh } from "@/lib/sanity/sport";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendExpoPush, type PushMessage } from "@/lib/push/expo";

const BASE_URL = "https://mojprilep.mk";

export type ClubApprovedResult =
  | { ok: true; sent: number; pruned: number }
  | { skipped: string }
  | { error: string };

export async function broadcastClubApproved(
  id: string | undefined,
): Promise<ClubApprovedResult> {
  if (!id || id.startsWith("drafts.")) return { skipped: "not a published club" };

  const club = await fetchSportClubFresh(id);
  if (!club) return { skipped: "club not found" };
  if (!club.ownerUserId) return { skipped: "club has no submitter" };
  if (!club.slug) return { skipped: "club has no slug" };

  const admin = createAdminClient();

  // Claim the club — a namespaced id so it shares push_broadcasts with events
  // and sport posts without ever colliding. The first publish wins; re-publishes
  // and edits hit the unique violation below and no-op.
  const claimId = `clubApproved:${club._id}`;
  const { error: claimErr } = await admin
    .from("push_broadcasts")
    .insert({ event_id: claimId });
  if (claimErr) {
    if (claimErr.code === "23505") return { skipped: "already notified" };
    console.error("[push/clubApproved] claim", claimErr);
    return { error: "claim failed" };
  }

  // The submitter's enabled devices.
  const { data: rows, error } = await admin
    .from("push_subscriptions")
    .select("expo_token")
    .eq("enabled", true)
    .eq("user_id", club.ownerUserId);
  if (error) {
    console.error("[push/clubApproved] tokens", error);
    return { error: "Could not read subscriptions" };
  }

  const tokens = (rows ?? []).map((r) => r.expo_token as string).filter(Boolean);
  if (tokens.length === 0) return { ok: true, sent: 0, pruned: 0 };

  const link = `${BASE_URL}/sport/${club.slug}`;
  const title = club.name ? `${club.name} е одобрен ✅` : "Клубот е одобрен ✅";
  const messages: PushMessage[] = tokens.map((to) => ({
    to,
    title,
    body: "Твојот профил е објавен и веќе е видлив за сите. Може да објавуваш новости.",
    data: { link, type: "clubApproved" },
    channelId: "default",
  }));

  const tickets = await sendExpoPush(messages);
  const dead: string[] = [];
  tickets.forEach((t, i) => {
    const code = (t.details as { error?: string } | undefined)?.error;
    if (t.status === "error" && code === "DeviceNotRegistered") dead.push(tokens[i]);
  });
  if (dead.length) await admin.from("push_subscriptions").delete().in("expo_token", dead);

  return { ok: true, sent: tokens.length, pruned: dead.length };
}
