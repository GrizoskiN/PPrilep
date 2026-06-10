-- ════════════════════════════════════════════════════════════════════════════
--  Security Advisor: "RLS Disabled in Public" on public.spatial_ref_sys
--
--  spatial_ref_sys is a static PostGIS reference table (list of coordinate
--  systems). It is owned by the PostGIS extension, so we cannot ENABLE RLS on
--  it (we don't own it). Instead we remove it from the PostgREST API surface by
--  revoking read access from the API roles. It is never queried by the app.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

revoke all on table public.spatial_ref_sys from anon, authenticated;
