-- ════════════════════════════════════════════════════════════════════════════
--  Комуналец contact / service-request inbox
--
--  Logged-in residents send Комуналец a structured request: a complaint (by
--  category), an order for a container (контејнер), or an order for a tractor /
--  garbage pickup (трактор). Each row notifies the Комуналец operator account
--  (in-app + one email, handled in app/actions/komunalec.ts).
--
--  Reuses the helpers from add_agencies.sql (is_admin(), current_user_agency()).
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.komunalec_requests (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('complaint','container','tractor')),
  category     text,                       -- only for complaints: 'garbage' | 'park'
  full_name    text not null,
  phone        text not null,
  address      text,
  district     text,
  message      text,
  photo_url    text,
  scheduled_at timestamptz,                -- preferred date/time for container/tractor orders
  status       text not null default 'new'
                 check (status in ('new','in_progress','done','rejected')),
  created_at   timestamptz not null default now()
);

-- Safe to re-run if the table was created before this column existed.
alter table public.komunalec_requests
  add column if not exists scheduled_at timestamptz;

create index if not exists komunalec_requests_status_idx     on public.komunalec_requests(status);
create index if not exists komunalec_requests_created_at_idx on public.komunalec_requests(created_at desc);

alter table public.komunalec_requests enable row level security;

-- Insert: a logged-in user may only file under their own id.
drop policy if exists "Insert own komunalec request" on public.komunalec_requests;
create policy "Insert own komunalec request"
  on public.komunalec_requests
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Select: the author, an admin, or the Комуналец operator.
drop policy if exists "Read own or komunalec requests" on public.komunalec_requests;
create policy "Read own or komunalec requests"
  on public.komunalec_requests
  for select to authenticated
  using (
    auth.uid() = user_id
    or public.is_admin()
    or public.current_user_agency() = 'komunalec'
  );

-- Update (status): admin or the Комуналец operator only.
drop policy if exists "Manage komunalec requests" on public.komunalec_requests;
create policy "Manage komunalec requests"
  on public.komunalec_requests
  for update to authenticated
  using (public.is_admin() or public.current_user_agency() = 'komunalec')
  with check (public.is_admin() or public.current_user_agency() = 'komunalec');
