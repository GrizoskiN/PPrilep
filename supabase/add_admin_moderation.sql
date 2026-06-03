-- Owner + admin moderation for initiatives and ideas.
-- Owners can edit/delete their own; admins (profiles.is_admin = true) can delete any.
-- Run once in the Supabase SQL editor.

-- ── Ensure the admin flag exists ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean default false;

-- ── Helper: is the current user an admin? (SECURITY DEFINER avoids RLS loops) ──
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ── Initiatives: owner OR admin can update / delete ──────────────────────────
drop policy if exists "Own update initiative"          on public.initiatives;
drop policy if exists "Own or admin update initiative" on public.initiatives;
create policy "Own or admin update initiative" on public.initiatives
  for update using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Own delete initiative"          on public.initiatives;
drop policy if exists "Own or admin delete initiative" on public.initiatives;
create policy "Own or admin delete initiative" on public.initiatives
  for delete using (auth.uid() = user_id or public.is_admin());

-- ── Ideas: owner OR admin can delete (no delete policy existed before) ───────
drop policy if exists "Own or admin delete idea" on public.ideas;
create policy "Own or admin delete idea" on public.ideas
  for delete using (auth.uid() = created_by or public.is_admin());

-- ── Flag the platform owner as admin ─────────────────────────────────────────
update public.profiles p
   set is_admin = true
  from auth.users u
 where u.id = p.id
   and u.email = 'ngrizo@gmail.com';
