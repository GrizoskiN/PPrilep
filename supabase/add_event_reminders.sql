-- ════════════════════════════════════════════════════════════════════════════
--  Event reminders — "Потсети ме" opt-ins for Случувања (city events).
--
--  A device taps "Потсети ме" on an event and we store its Expo push token here.
--  An hourly Vercel cron (/api/cron/event-reminders) later pushes a reminder to
--  every opted-in device ~3 hours before the event (floored at 11:00 local), and
--  stamps `notified_at` so it never double-sends.
--
--  Identity is the DEVICE (expo_token), not the user, so a signed-out person who
--  tapped still gets reminded — mirroring how push_subscriptions is per-device.
--  `user_id` is kept when known (nice for a future "my reminders" screen) but the
--  token is what delivery uses. All access goes through the service role
--  (/api/events/remind + the cron); RLS is on with no public policies.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.event_reminders (
  id          bigint generated always as identity primary key,
  event_id    text not null,                     -- Sanity cityEvent _id
  expo_token  text not null,                     -- ExponentPushToken[...]
  user_id     uuid references auth.users(id) on delete set null,
  notified_at timestamptz,                       -- set once the reminder is sent
  created_at  timestamptz not null default now(),
  unique (event_id, expo_token)
);

create index if not exists event_reminders_event_idx on public.event_reminders(event_id);
-- The cron scans for un-sent reminders per event; this keeps that cheap.
create index if not exists event_reminders_pending_idx
  on public.event_reminders(event_id) where notified_at is null;

alter table public.event_reminders enable row level security;

-- No public policies: writes go through the service role (remind route + cron),
-- which bypasses RLS. Authenticated users may read/remove their own rows (for a
-- future "my reminders" view); anonymous device rows are managed by the server.
drop policy if exists "Read own event reminders" on public.event_reminders;
create policy "Read own event reminders"
  on public.event_reminders for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Delete own event reminders" on public.event_reminders;
create policy "Delete own event reminders"
  on public.event_reminders for delete
  to authenticated
  using (user_id = auth.uid());
