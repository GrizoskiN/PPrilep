-- The membership_requests.tier check constraint was created before the
-- mega_donor and mega_donator tiers existed; inserting a request for either
-- fails with membership_requests_tier_check. Realign it with the current
-- profiles.membership_tier constraint (see add_mega_donator_category.sql).
-- Run once in the Supabase SQL editor.

alter table public.membership_requests
  drop constraint if exists membership_requests_tier_check;

alter table public.membership_requests
  add constraint membership_requests_tier_check
  check (tier in (
    'volunteer',
    'monthly',
    'yearly',
    'mega_donor',
    'mega_donator',
    'company_basic',
    'company_preferred',
    'company_premium'
  ));
