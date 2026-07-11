-- ════════════════════════════════════════════════════════════════════════════
--  Push broadcasts — dedupe lock for one-time event push notifications
--
--  The event push webhook (/api/push/event, a Sanity webhook on cityEvent) fires
--  on every create/update. To notify citizens exactly ONCE per event (not on
--  every edit), it claims the event's id here first; a duplicate insert (unique
--  violation) means "already broadcast → skip". Same pattern as social_posts.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.push_broadcasts (
  event_id     text primary key,           -- Sanity cityEvent _id
  created_at   timestamptz not null default now()
);

alter table public.push_broadcasts enable row level security;
-- No policies: only the service role (the webhook route) touches this table.
