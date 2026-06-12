-- ════════════════════════════════════════════════════════════════════════════
--  Pre-launch security hardening — PART 2 (corrective). Run ONCE after part 1.
--
--  Part 1 fixed the HIGH issue (agency_set_issue_status fail-open) — verified
--  working: anon now gets "Not authorised". But two statements in part 1 were
--  NO-OPS and are corrected here:
--
--  WHY part 1 didn't bite:
--    This project grants `anon`/`authenticated` their privileges DIRECTLY
--    (via Supabase's ALTER DEFAULT PRIVILEGES), not through the PUBLIC role.
--    Therefore:
--      • `REVOKE EXECUTE … FROM public`        — removes nothing (anon's grant
--                                                 is direct, not via PUBLIC).
--      • `REVOKE SELECT (col) … FROM anon`     — a column-level revoke does NOT
--                                                 override anon's TABLE-level
--                                                 SELECT grant, so all columns
--                                                 stayed readable.
--    The correct pattern (same as harden_profiles_rls.sql did for UPDATE):
--    REVOKE the table/function grant from the actual role, then re-grant the
--    safe subset.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Lock down PII columns on profiles (home location + private prefs) ─────
--     Drop anon's blanket table SELECT, then hand back ONLY the columns the
--     public (logged-out) UI actually reads. Verified against every anon-facing
--     profiles query in the app.
--
--     `authenticated` is intentionally untouched — each user's own /account
--     page reads street_name/district/prefs as the authenticated role.

revoke select on public.profiles from anon;

grant select (
  id,
  username,
  full_name,
  avatar_url,
  points,
  membership_tier,
  is_company,
  agency_id,
  created_at,
  onboarded
) on public.profiles to anon;

-- Intentionally NOT granted to anon (and thus no longer leaked):
--   street_name, district          → citizen home location (PII)
--   email_digest, email_newsletter → contact preferences
--   notif_local_issues             → notification preference
--   membership_expires_at          → internal billing/expiry detail
--   is_admin                       → stops anonymous enumeration of admins
--                                    (all is_admin reads are behind `if (user)`)

-- ── 2. Actually revoke EXECUTE from anon on privileged functions ─────────────
--     Belt-and-suspenders: these all have correct internal auth checks, but a
--     non-authenticated caller has no business reaching them at all.

revoke execute on function public.agency_set_issue_status(bigint, text, text) from anon;
revoke execute on function public.create_agency_post(text, text, text, text, text[], boolean) from anon;
revoke execute on function public.update_agency_post(bigint, text, text) from anon;
revoke execute on function public.delete_agency_post(bigint) from anon;
revoke execute on function public.toggle_idea_upvote(bigint) from anon;
revoke execute on function public.toggle_initiative_vote(uuid) from anon;

-- Maintenance function — only pg_cron should run it. pg_cron executes as the
-- superuser, which bypasses EXECUTE checks, so removing it from both client
-- roles does not break the scheduled job.
revoke execute on function public.expire_monthly_memberships() from anon, authenticated;

-- ── Refresh PostgREST ────────────────────────────────────────────────────────
notify pgrst, 'reload schema';
