-- Add membership tier to profiles.
-- Run once in the Supabase SQL editor.

alter table public.profiles
  add column if not exists membership_tier text
  check (membership_tier in (
    'volunteer',
    'monthly',
    'yearly',
    'company_basic',
    'company_preferred',
    'company_premium'
  ));

-- Users can update their own membership_tier
drop policy if exists "Own membership update" on public.profiles;
create policy "Own membership update" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);
