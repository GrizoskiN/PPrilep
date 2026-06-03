-- ════════════════════════════════════════════════════════════════════════════
--  Harden the `profiles` table against privilege escalation.
--  Run ONCE in the Supabase SQL editor.
--
--  WHY:
--  Postgres RLS UPDATE policies restrict *which rows* a user may change, NOT
--  *which columns*. The existing "Own profile" policy
--      for update using (auth.uid() = id)
--  let any authenticated user run:
--      update profiles set is_admin = true        where id = <self>;   -- ⇒ ADMIN
--      update profiles set membership_tier = 'company_premium' ...      -- ⇒ fake partner
--      update profiles set points = 999999 ...                          -- ⇒ fake leaderboard
--  i.e. anyone could make themselves an admin. This migration closes that hole
--  using column-level privileges (the canonical Postgres mechanism).
--
--  Privileged columns (is_admin, is_company, membership_tier, points) become
--  writable ONLY by:
--    • the service role (server actions using the admin client), and
--    • SECURITY DEFINER functions (handle_new_user, award_applause) which run
--      as the table owner and therefore keep full privileges.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0. Ensure the user-editable columns exist ────────────────────────────────
alter table public.profiles
  add column if not exists street_name      text,
  add column if not exists district         text,
  add column if not exists email_digest     boolean not null default true,
  add column if not exists email_newsletter boolean not null default false;

-- ── 1. Remove the policy that let users self-assign a membership tier ─────────
--     (membership is granted by an admin after a membership_request.)
drop policy if exists "Own membership update" on public.profiles;

-- ── 2. Recreate the self-update policy WITH CHECK (defense in depth) ──────────
--     WITH CHECK stops a user from re-pointing their row's id at someone else.
drop policy if exists "Own profile" on public.profiles;
create policy "Own profile" on public.profiles
  for update
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 3. Column-level write privileges ─────────────────────────────────────────
--     Take away blanket UPDATE, then hand back ONLY the safe columns.
revoke update on public.profiles from authenticated, anon;

grant update (
  username,
  full_name,
  avatar_url,
  street_name,
  district,
  email_digest,
  email_newsletter
) on public.profiles to authenticated;

-- Note: is_admin, is_company, membership_tier, points are intentionally NOT
-- granted to `authenticated`, so direct API updates to them are rejected.
-- The admin panel / server actions write them via the service-role client,
-- and award_applause()/handle_new_user() write them as SECURITY DEFINER.
