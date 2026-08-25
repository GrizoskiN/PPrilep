-- Fix: movie poll ids are text (Sanity _id), not bigint.
--
-- An earlier draft of add_movie_polls.sql kept the poll itself in a
-- `movie_polls` table with a bigint id. The poll now lives in Sanity, so
-- `poll_id` holds a document _id — but `create table if not exists` silently
-- left the old bigint columns in place, and every suggestion failed with
--   invalid input syntax for type bigint
--
-- Both contribution tables are dropped and rebuilt rather than altered: they
-- were empty (0 options, 0 votes), and the old `movie_polls` row is a draft
-- from that first version with nothing pointing at it.
--
-- Run once in the Supabase SQL editor. Supersedes add_movie_polls.sql.

drop table if exists public.movie_poll_votes;
drop table if exists public.movie_poll_options;
drop table if exists public.movie_polls;

-- ── Options — one row per suggested film ─────────────────────────────────────
create table if not exists public.movie_poll_options (
  id          bigint generated always as identity primary key,
  -- Sanity document _id of the moviePoll this belongs to.
  poll_id     text        not null,
  title       text        not null,
  -- Case/whitespace/punctuation-folded title, written by the trigger below and
  -- used only by the unique index. Without it "Матрикс", "matrix" and "Matrix!"
  -- are three different films on the same list.
  norm_title  text        not null,
  -- Always set: only signed-in users may suggest. `set null` on delete keeps
  -- the film on the list when its suggester deletes their account — the votes
  -- other people cast for it are not theirs to remove.
  created_by  uuid        references public.profiles(id) on delete set null,
  -- Moderation: hidden options keep their votes but disappear from the list.
  is_hidden   boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- `unaccent` lives in an extension that may not be installed; this wrapper
-- keeps the trigger working either way rather than failing the migration.
create or replace function public.unaccent_safe(t text)
returns text
language plpgsql
immutable
as $$
begin
  return unaccent(t);
exception when undefined_function then
  return t;
end;
$$;

create or replace function public.movie_poll_norm_title()
returns trigger
language plpgsql
as $$
begin
  -- Fold case and accents, drop everything that is not a letter, digit or
  -- space, then collapse runs of whitespace.
  new.norm_title := trim(regexp_replace(
    regexp_replace(lower(unaccent_safe(new.title)), '[^[:alnum:] ]', '', 'g'),
    '\s+', ' ', 'g'
  ));
  return new;
end;
$$;

drop trigger if exists movie_poll_options_norm on public.movie_poll_options;
create trigger movie_poll_options_norm
  before insert or update of title on public.movie_poll_options
  for each row execute function public.movie_poll_norm_title();

-- One film per poll, however it was typed.
create unique index if not exists movie_poll_options_norm_uidx
  on public.movie_poll_options (poll_id, norm_title);

create index if not exists movie_poll_options_poll_idx
  on public.movie_poll_options (poll_id) where not is_hidden;

-- Counting "how many has this user suggested here" on every suggestion.
create index if not exists movie_poll_options_author_idx
  on public.movie_poll_options (poll_id, created_by);

-- ── Votes ────────────────────────────────────────────────────────────────────
create table if not exists public.movie_poll_votes (
  id          bigint generated always as identity primary key,
  poll_id     text        not null,
  option_id   bigint      not null references public.movie_poll_options(id) on delete cascade,
  user_id     uuid        references auth.users(id) on delete cascade,
  visitor_id  text,
  created_at  timestamptz not null default now(),
  -- Exactly one actor identifies the row.
  constraint movie_poll_votes_actor_chk check (num_nonnulls(user_id, visitor_id) = 1)
);

-- Single-choice: one vote per actor per poll (not per option).
create unique index if not exists movie_poll_votes_user_uidx
  on public.movie_poll_votes (poll_id, user_id) where user_id is not null;
create unique index if not exists movie_poll_votes_visitor_uidx
  on public.movie_poll_votes (poll_id, visitor_id) where visitor_id is not null;

create index if not exists movie_poll_votes_option_idx
  on public.movie_poll_votes (option_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.movie_poll_options enable row level security;
alter table public.movie_poll_votes   enable row level security;

-- Options are public reading material; writes go through the route.
-- Dropped first so the whole file stays re-runnable — `create policy` has no
-- `if not exists`.
drop policy if exists "movie_poll_options_read_all" on public.movie_poll_options;
create policy "movie_poll_options_read_all"
  on public.movie_poll_options for select using (not is_hidden);

-- Votes: no policies at all → service role only. A public read policy would
-- expose who voted for what, which this poll has no reason to reveal.

notify pgrst, 'reload schema';
