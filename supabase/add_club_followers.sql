-- ════════════════════════════════════════════════════════════════════════════
--  Club followers — "Следи не" on a Спорт и Рекреација profile
--
--  A resident follows a club to be notified when it publishes a new post. The
--  follow is per (user, club_slug): the slug is the club's stable Sanity slug,
--  the same value used in the profile URL /sport/<slug>. When a sportPost is
--  published, lib/push/sportPost.ts reads this table to fan a push out to every
--  follower's devices (via push_subscriptions). Idempotency of that broadcast is
--  handled by push_broadcasts (id `sportPost:<_id>`), not here.
--
--  RLS scopes every row to its owner so the mobile app's anon+JWT client can read
--  and write a user's own follows directly; the web follow API and the push
--  broadcaster use the service role, which bypasses RLS.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.club_followers (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  club_slug   text        not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, club_slug)
);

-- Fan-out reads the followers of one club, so index the slug.
create index if not exists club_followers_slug_idx
  on public.club_followers (club_slug);

alter table public.club_followers enable row level security;

-- A user may see, create and remove only their own follows. The service role
-- (follow API + push broadcaster) bypasses these entirely.
create policy "read own follows"
  on public.club_followers for select
  using (auth.uid() = user_id);

create policy "insert own follows"
  on public.club_followers for insert
  with check (auth.uid() = user_id);

create policy "delete own follows"
  on public.club_followers for delete
  using (auth.uid() = user_id);
