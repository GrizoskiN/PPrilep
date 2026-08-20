-- Single-choice poll votes for city events (Случувања).
--
-- Events live in Sanity; the poll (question + options) is authored on the
-- cityEvent document. This table only records votes, keyed by the Sanity
-- document _id (event_id) and the chosen option's Sanity array `_key`
-- (option_key). It mirrors event_interest exactly — same hybrid identity, same
-- service-role-only access.
--
-- Single-choice: at most one row per actor per event. Switching your vote
-- UPDATEs option_key on that one row; retracting DELETEs it. The two partial
-- unique indexes enforce "one vote per actor per event" for each identity kind.
--
-- All reads/writes go through the service-role server route
-- (app/api/events/poll). RLS is enabled with NO public policies, so the
-- anon/authenticated roles can never touch this table directly.

create table if not exists public.event_poll_votes (
  id          bigint generated always as identity primary key,
  event_id    text        not null,
  option_key  text        not null,
  user_id     uuid        references auth.users(id) on delete cascade,
  visitor_id  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Exactly one actor identifies the row.
  constraint event_poll_votes_actor_chk check (num_nonnulls(user_id, visitor_id) = 1)
);

-- One vote per (event, user) and one per (event, anonymous visitor).
create unique index if not exists event_poll_votes_user_uidx
  on public.event_poll_votes (event_id, user_id) where user_id is not null;
create unique index if not exists event_poll_votes_visitor_uidx
  on public.event_poll_votes (event_id, visitor_id) where visitor_id is not null;

-- Tally-by-event lookups.
create index if not exists event_poll_votes_event_idx
  on public.event_poll_votes (event_id);

-- RLS on, no policies → locked to the service role only.
alter table public.event_poll_votes enable row level security;

notify pgrst, 'reload schema';
