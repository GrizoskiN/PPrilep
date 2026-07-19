-- Membership / partnership requests table.
-- Run once in the Supabase SQL editor.

create table if not exists public.membership_requests (
  id           bigserial primary key,
  user_id      uuid references public.profiles(id) on delete set null,
  full_name    text not null,
  email        text not null,
  phone        text,
  message      text,
  tier         text not null check (tier in (
    'volunteer','monthly','yearly','mega_donor','mega_donator',
    'company_basic','company_preferred','company_premium'
  )),
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected')),
  created_at   timestamptz default now()
);

alter table public.membership_requests enable row level security;

-- Anyone authenticated can insert their own request
create policy "Insert own request" on public.membership_requests
  for insert with check (auth.uid() = user_id or user_id is null);

-- Admins can read and update all requests
create policy "Admin read requests" on public.membership_requests
  for select using (public.is_admin());

create policy "Admin update requests" on public.membership_requests
  for update using (public.is_admin());
