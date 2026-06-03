-- Allow admins to update any profile (needed for membership tier management).
-- Run once in the Supabase SQL editor.

drop policy if exists "Admin update any profile" on public.profiles;
create policy "Admin update any profile" on public.profiles
  for update
  using  (public.is_admin())
  with check (public.is_admin());
