-- Dedupe ledger for auto-posting city events to Facebook / Instagram.
--
-- The /api/social/publish webhook fires on every Sanity create/update, but an
-- event must be announced only ONCE. Each event claims a row here (event_id is
-- the Sanity document _id and is unique); a duplicate insert (23505) means it
-- was already posted, so the webhook skips it.
--
-- Written only by the service-role server route, so RLS is enabled with no
-- public policies (service role bypasses RLS).

create table if not exists public.social_posts (
  event_id   text        primary key,   -- Sanity document _id
  fb_post_id text,                       -- Facebook post id (null if FB failed/off)
  ig_post_id text,                       -- Instagram media id (null if IG failed/off)
  created_at timestamptz not null default now(),  -- when the claim was made
  posted_at  timestamptz                 -- when posting completed
);

-- RLS on, no policies → locked to the service role only.
alter table public.social_posts enable row level security;

notify pgrst, 'reload schema';
