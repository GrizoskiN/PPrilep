-- ════════════════════════════════════════════════════════════════════════════
--  Give agency_posts an optional `source_ref` so posts synced from an external
--  feed (e.g. the ЕВН / Електродистрибуција outages API) can be de-duplicated
--  and refreshed instead of re-inserted on every sync run.
--
--  NULL for normal operator-authored posts — only the ingester sets it.
--  The unique index is partial (source_ref is not null), so it never constrains
--  the many hand-written posts that share a NULL here.
--
--  Run ONCE in the Supabase SQL editor (after add_agency_posts.sql +
--  add_agency_post_schedule.sql).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.agency_posts
  add column if not exists source_ref text;

create unique index if not exists agency_posts_source_ref_uidx
  on public.agency_posts(agency_id, source_ref)
  where source_ref is not null;

notify pgrst, 'reload schema';
