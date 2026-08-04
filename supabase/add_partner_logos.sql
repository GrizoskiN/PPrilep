-- ════════════════════════════════════════════════════════════════════════════
--  Storage bucket for manually-entered partner logos.
--
--  Public read (the logo renders for everyone, signed out included), but only
--  admins may write — unlike `initiative-images`, where any authenticated user
--  uploads their own cover. Partner logos are curated by the site owner alone,
--  so the write policies check is_admin() rather than auth.role().
--
--  Run ONCE in the Supabase SQL editor (after add_manual_partners.sql).
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('partner-logos', 'partner-logos', true)
on conflict (id) do nothing;

drop policy if exists "Public read partner logos" on storage.objects;
create policy "Public read partner logos" on storage.objects
  for select using (bucket_id = 'partner-logos');

drop policy if exists "Admin upload partner logos" on storage.objects;
create policy "Admin upload partner logos" on storage.objects
  for insert with check (bucket_id = 'partner-logos' and public.is_admin());

drop policy if exists "Admin update partner logos" on storage.objects;
create policy "Admin update partner logos" on storage.objects
  for update using (bucket_id = 'partner-logos' and public.is_admin());

drop policy if exists "Admin delete partner logos" on storage.objects;
create policy "Admin delete partner logos" on storage.objects
  for delete using (bucket_id = 'partner-logos' and public.is_admin());
