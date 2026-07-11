-- ════════════════════════════════════════════════════════════════════════════
--  Push subscriptions — Expo push tokens for the native app (Мој Прилеп mobile)
--
--  One row per device. The device registers its Expo push token via
--  POST /api/push/register (service-role upsert, so it bypasses RLS). A token
--  may be anonymous (user_id null) — civic alerts (bus, announcements) go to
--  everyone — or tied to a Supabase user once they sign in.
--
--  Sending is done server-side by POST /api/push/send (CRON_SECRET-guarded),
--  which reads enabled tokens with the service role and calls the Expo Push API.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  id           bigint generated always as identity primary key,
  expo_token   text not null unique,              -- ExponentPushToken[...]
  user_id      uuid references auth.users(id) on delete set null,
  platform     text,                              -- 'ios' | 'android'
  enabled      boolean not null default true,     -- user can mute without unregistering
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists push_subscriptions_enabled_idx on public.push_subscriptions(enabled);
create index if not exists push_subscriptions_user_idx    on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- No public policies: all writes go through the service role (register/send
-- routes), which bypasses RLS. Authenticated users may see & remove their own
-- registrations (e.g. a future "my devices" screen).
drop policy if exists "Read own push subscriptions" on public.push_subscriptions;
create policy "Read own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Delete own push subscriptions" on public.push_subscriptions;
create policy "Delete own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());
