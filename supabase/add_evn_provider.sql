-- ════════════════════════════════════════════════════════════════════════════
--  Add EVN as its own institution + utility provider.
--
--  Why a separate one: `osvetluvanje` is the municipal STREET-lighting service.
--  EVN is the national distributor that supplies households. Folding them into
--  one entry would tell citizens to report home outages to a municipal service
--  with no authority over the grid.
--
--  EVN does NOT get an operator account and is deliberately absent from
--  `agency_categories` — it handles no citizen issue category. Its posts are
--  published manually by an admin via create_agency_post(p_as_agency => 'evn').
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. The agency row (sorted next to the other utilities) ───────────────────
insert into public.agencies (id, name, sort) values
  ('vodovod',           'Водовод',                 1),
  ('komunalec',         'Комуналец',               2),
  ('osvetluvanje',      'Јавно осветлување',       3),
  ('evn',               'ЕВН Македонија',          4),
  ('transport_parking', 'Јавен превоз и паркинзи', 5),
  ('municipality',      'Општина Прилеп',          6)
on conflict (id) do update set name = excluded.name, sort = excluded.sort;

-- ── 2. Allow 'electricity' in utility_posts ─────────────────────────────────
alter table public.utility_posts
  drop constraint if exists utility_posts_provider_check;

alter table public.utility_posts
  add constraint utility_posts_provider_check
    check (provider in
      ('water','garbage','power','transport','parking','kindergarten','electricity'));

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
