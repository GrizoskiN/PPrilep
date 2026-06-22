-- ════════════════════════════════════════════════════════════════════════════
--  Bus fleet — vehicles and their currently-assigned line
--
--  Source of truth for which physical bus runs which line. The live-positions
--  endpoint (/api/buses/positions) reads this table, then pulls each bus's GPS
--  fix from Flespi by flespi_device_id. The Јавен превоз operator account
--  (agency_id = 'transport_parking') and site admins can reassign a bus to a
--  different line at runtime — no deploy needed.
--
--  `active_line_id` matches a route id in lib/data/busRoutes.ts ('line1' etc.).
--  Reads are public (bus positions are public info); writes are operator/admin
--  only. Uses is_admin() / current_user_agency() from add_agencies.sql.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.buses (
  id               bigint generated always as identity primary key,
  label            text not null,                -- "Автобус 1"
  flespi_device_id bigint not null unique,       -- Flespi gw/devices/<id>
  active_line_id   text,                          -- route id ('line1'..) or null = unassigned
  is_active        boolean not null default true, -- in service / shown on the map
  created_at       timestamptz not null default now()
);

create index if not exists buses_active_idx on public.buses(is_active);

alter table public.buses enable row level security;

-- Public read — positions are public information.
drop policy if exists "Public read buses" on public.buses;
create policy "Public read buses"
  on public.buses for select
  to anon, authenticated
  using (true);

-- Admin or the Јавен превоз operator may add / reassign / retire buses.
drop policy if exists "Manage buses" on public.buses;
create policy "Manage buses"
  on public.buses for all
  to authenticated
  using (public.is_admin() or public.current_user_agency() = 'transport_parking')
  with check (public.is_admin() or public.current_user_agency() = 'transport_parking');

-- Seed the bus already streaming to Flespi.
insert into public.buses (label, flespi_device_id, active_line_id)
select 'Автобус 1', 8414769, 'line1'
where not exists (select 1 from public.buses where flespi_device_id = 8414769);
