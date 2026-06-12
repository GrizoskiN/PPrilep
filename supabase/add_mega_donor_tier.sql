-- Add the "МегаГига Донатор" member tier (gold trophy badge).
-- Members-only tier; sits as the 4th member category after yearly.
-- Run once in the Supabase SQL editor.

alter table public.profiles
  drop constraint if exists profiles_membership_tier_check;

alter table public.profiles
  add constraint profiles_membership_tier_check
  check (membership_tier in (
    'volunteer',
    'monthly',
    'yearly',
    'mega_donor',
    'company_basic',
    'company_preferred',
    'company_premium'
  ));
