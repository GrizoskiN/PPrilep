-- "Заинтересиран" counter for Случувања (city events).
--
-- Events live in Sanity, not Postgres, so there is no FK to reference — the
-- event_id column just stores the Sanity document _id as text.
--
-- Hybrid identity: a logged-in user is deduped by user_id; an anonymous
-- visitor by a client-generated visitor_id (kept in localStorage). Exactly one
-- of the two identifies each row, enforced below. Two partial unique indexes
-- give "one interest per actor per event" for each identity kind.
--
-- All reads/writes go through the service-role server route
-- (app/api/events/interest). Anonymous rows can't be checked with auth.uid(),
-- so RLS is enabled with NO public policies: only the service role (which
-- bypasses RLS) touches this table. Nothing is exposed to the anon/authenticated
-- API roles directly.

create table if not exists public.event_interest (
  id         bigint generated always as identity primary key,
  event_id   text        not null,
  user_id    uuid        references auth.users(id) on delete cascade,
  visitor_id text,
  created_at timestamptz not null default now(),
  -- Exactly one actor identifies the row.
  constraint event_interest_actor_chk check (num_nonnulls(user_id, visitor_id) = 1)
);

-- Dedupe: one row per (event, user) and one per (event, anonymous visitor).
create unique index if not exists event_interest_user_uidx
  on public.event_interest (event_id, user_id) where user_id is not null;
create unique index if not exists event_interest_visitor_uidx
  on public.event_interest (event_id, visitor_id) where visitor_id is not null;

-- Count-by-event lookups.
create index if not exists event_interest_event_idx
  on public.event_interest (event_id);

-- RLS on, no policies → locked to the service role only.
alter table public.event_interest enable row level security;

notify pgrst, 'reload schema';
