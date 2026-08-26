-- ════════════════════════════════════════════════════════════════════════════
--  Спорт и Рекреација — Фаза 2: клубски сметки
--
--  Gives a club's own Мој Прилеп account the right to edit its profile and post
--  news, without a second login system. Mirrors the agency operator model in
--  add_agencies.sql: one nullable column on profiles + SECURITY DEFINER
--  helpers, никогаш column grants.
--
--  WHY THE SLUG AND NOT A NEW TABLE
--  The club documents live in Sanity, not here. Postgres has nothing to
--  reference, so `profiles.club_id` holds the Sanity `sportClub.slug` — the
--  same string the URL uses (/sport/<slug>), which makes the binding readable
--  in the dashboard and checkable in one comparison.
--
--  THIS TABLE IS THE SINGLE SOURCE OF TRUTH for "may this user write to this
--  club". `sportClub.ownerId` in Sanity stays informational (who it was given
--  to, for the editor's benefit) and is NEVER consulted for authorization — two
--  authorities would eventually disagree, and the reader would see the
--  disagreement, not the design.
--
--  CONSEQUENCE OF THAT CHOICE: renaming a club's slug in Studio orphans its
--  owner. Update this column in the same sitting, or don't rename slugs.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Bind a profile to one club ────────────────────────────────────────────
alter table public.profiles
  add column if not exists club_id text;

comment on column public.profiles.club_id is
  'Sanity sportClub.slug this account may edit. NULL for normal users. Set by an admin.';

create index if not exists profiles_club_id_idx on public.profiles(club_id);

-- ── 2. Helpers ───────────────────────────────────────────────────────────────
-- The slug of the club the current user owns (null for everyone else).
create or replace function public.current_user_club()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select club_id from public.profiles where id = auth.uid();
$$;
grant execute on function public.current_user_club() to authenticated;

-- May the current user write to this club? Site admins always may.
create or replace function public.user_owns_club(p_slug text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin()
      or (p_slug is not null and p_slug = public.current_user_club());
$$;
grant execute on function public.user_owns_club(text) to authenticated;

-- ── 3. Give a club its account ───────────────────────────────────────────────
--  The club registers on Мој Прилеп like anyone else; you then bind it here.
--  Re-runnable — edit the two values and run the one statement.
--
--  update public.profiles p
--     set club_id = 'fk-pobeda'                       -- the Sanity slug
--    from auth.users u
--   where u.id = p.id
--     and u.email = 'klub@example.com';               -- the club's login
--
--  Check what is bound right now:
--  select p.username, p.club_id, u.email
--    from public.profiles p join auth.users u on u.id = p.id
--   where p.club_id is not null
--   order by p.club_id;
--
--  Take access away (the profile stays, the club stays):
--  update public.profiles set club_id = null where club_id = 'fk-pobeda';
