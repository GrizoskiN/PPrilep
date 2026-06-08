-- Security Advisor: "Security Definer View" on public.initiatives_with_details
--
-- By default a Postgres view runs with the permissions/RLS of its CREATOR, not
-- the querying user — which can leak rows past the caller's RLS. Switching the
-- view to security_invoker makes it enforce the *querying* user's RLS instead.
--
-- Safe here: the view only exposes already-public initiative data plus the
-- author's public name/avatar. Run once in the Supabase SQL editor.

alter view public.initiatives_with_details set (security_invoker = on);

-- NOTE: the other advisor item, "RLS Disabled in Public" on public.spatial_ref_sys,
-- is a PostGIS extension-owned reference table and cannot have RLS enabled without
-- superuser. It contains only public coordinate-system definitions — safe to ignore.
