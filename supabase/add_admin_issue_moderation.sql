-- Owner + admin moderation for issues (reports).
-- The author can edit/delete their own report; a site admin
-- (profiles.is_admin = true, see add_admin_moderation.sql) can edit/delete any.
-- Run once in the Supabase SQL editor. Requires public.is_admin() to exist
-- (created by add_admin_moderation.sql) — run that first if you haven't.

-- ── Issues: author OR admin can update ───────────────────────────────────────
drop policy if exists "Own update issue"          on public.issues;
drop policy if exists "Own or admin update issue" on public.issues;
create policy "Own or admin update issue" on public.issues
  for update using (auth.uid() = reported_by or public.is_admin());

-- ── Issues: author OR admin can delete ───────────────────────────────────────
drop policy if exists "Own delete issue"          on public.issues;
drop policy if exists "Own or admin delete issue" on public.issues;
create policy "Own or admin delete issue" on public.issues
  for delete using (auth.uid() = reported_by or public.is_admin());
