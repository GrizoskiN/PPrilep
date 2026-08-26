/**
 * Server-side authorization for club self-service.
 *
 * One question, one answer, one place: "may this user write to this club?"
 * The answer comes from Postgres (`profiles.club_id`, set by an admin) — never
 * from Sanity's `ownerId`, which is informational only. See
 * supabase/add_sport_club_owners.sql for why there is exactly one authority.
 *
 * Read through the service-role client on purpose: the caller has already been
 * authenticated by getRequestUser(), and the row we need (`club_id`,
 * `is_admin`) is not something a user may be trusted to report about itself.
 */

import { createAdminClient } from "../supabase/admin";

export type ClubAccess = {
  /** The slug this account may edit, or null. Null for admins with no club. */
  clubSlug: string | null;
  isAdmin: boolean;
};

export async function getClubAccess(userId: string): Promise<ClubAccess> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("club_id, is_admin")
    .eq("id", userId)
    .maybeSingle();

  return {
    clubSlug: (data?.club_id as string | null) ?? null,
    isAdmin: data?.is_admin === true,
  };
}

/** True when the user owns this exact club, or is a site admin. */
export async function canWriteClub(userId: string, slug: string): Promise<boolean> {
  if (!slug.trim()) return false;
  const { clubSlug, isAdmin } = await getClubAccess(userId);
  return isAdmin || clubSlug === slug;
}
