-- ════════════════════════════════════════════════════════════════════════════
--  Phase 1 — Agency (institution) accounts + category routing
--
--  Gives 5 local institutions operator accounts. Each agency "handles" a set of
--  issue categories. A profile may be bound to one agency (operator account);
--  normal users have agency_id = null.
--
--  All privileged writes elsewhere go through SECURITY DEFINER RPCs that call
--  the helpers below — NOT column grants — to avoid the permission-denied class
--  of bug. Every function pins search_path so it survives supabase_auth_admin.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Agencies ──────────────────────────────────────────────────────────────
create table if not exists public.agencies (
  id   text primary key,
  name text not null,
  sort int  not null default 0
);

insert into public.agencies (id, name, sort) values
  ('vodovod',           'Водовод',                     1),
  ('komunalec',         'Комуналец',                   2),
  ('osvetluvanje',      'Јавно осветлување',           3),
  ('transport_parking', 'Јавен превоз и паркинзи',     4),
  ('municipality',      'Општина Прилеп',              5)
on conflict (id) do update set name = excluded.name, sort = excluded.sort;

-- ── 2. Category → agency mapping ─────────────────────────────────────────────
create table if not exists public.agency_categories (
  agency_id text not null references public.agencies(id) on delete cascade,
  category  text not null,
  primary key (agency_id, category)
);

insert into public.agency_categories (agency_id, category) values
  ('vodovod',           'water'),
  ('komunalec',         'garbage'),
  ('komunalec',         'park'),
  ('osvetluvanje',      'power'),
  ('transport_parking', 'transport'),
  ('transport_parking', 'parking'),
  ('municipality',      'road'),
  ('municipality',      'negligent'),
  ('municipality',      'admin'),
  ('municipality',      'other')
on conflict do nothing;

-- ── 3. Bind a profile to an agency (operator accounts) ───────────────────────
alter table public.profiles
  add column if not exists agency_id text references public.agencies(id);

create index if not exists profiles_agency_id_idx on public.profiles(agency_id);

-- Agencies + mapping are public read (UI needs the labels/mapping).
alter table public.agencies          enable row level security;
alter table public.agency_categories enable row level security;
drop policy if exists "Public agencies"  on public.agencies;
create policy "Public agencies"  on public.agencies          for select using (true);
drop policy if exists "Public agency_categories" on public.agency_categories;
create policy "Public agency_categories" on public.agency_categories for select using (true);

-- ── 4. Helper functions ──────────────────────────────────────────────────────
-- The current user's agency id (null for normal users).
create or replace function public.current_user_agency()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select agency_id from public.profiles where id = auth.uid();
$$;
grant execute on function public.current_user_agency() to authenticated;

-- Which agency owns a given category.
create or replace function public.agency_for_category(p_category text)
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select agency_id from public.agency_categories where category = p_category limit 1;
$$;
grant execute on function public.agency_for_category(text) to authenticated;

-- Can the current user act on this category? (super-admin, or their agency owns it)
create or replace function public.user_handles_category(p_category text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin()
      or exists (
        select 1 from public.agency_categories ac
        where ac.category = p_category
          and ac.agency_id = public.current_user_agency()
      );
$$;
grant execute on function public.user_handles_category(text) to authenticated;

-- ── 5. Bind operator accounts to agencies ────────────────────────────────────
--  AFTER you create the 5 auth users in Supabase → Authentication → Users,
--  set each one's email below and run this block. (Re-runnable.)
--  update public.profiles p set agency_id = 'vodovod'
--    from auth.users u where u.id = p.id and u.email = 'vodovod@mojprilep.mk';
--  update public.profiles p set agency_id = 'komunalec'
--    from auth.users u where u.id = p.id and u.email = 'komunalec@mojprilep.mk';
--  update public.profiles p set agency_id = 'osvetluvanje'
--    from auth.users u where u.id = p.id and u.email = 'osvetluvanje@mojprilep.mk';
--  update public.profiles p set agency_id = 'transport_parking'
--    from auth.users u where u.id = p.id and u.email = 'prevoz@mojprilep.mk';
--  update public.profiles p set agency_id = 'municipality'
--    from auth.users u where u.id = p.id and u.email = 'opstina@mojprilep.mk';
