-- Add the "МегаДонатор" account category (member tier), separate from the
-- existing "МегаГигаДонатор" (mega_donor). Both exist independently.
-- Badge: 💎 emerald.  Run once in the Supabase SQL editor.

alter table public.profiles
  drop constraint if exists profiles_membership_tier_check;

alter table public.profiles
  add constraint profiles_membership_tier_check
  check (membership_tier in (
    'volunteer',
    'monthly',
    'yearly',
    'mega_donor',
    'mega_donator',
    'company_basic',
    'company_preferred',
    'company_premium'
  ));
