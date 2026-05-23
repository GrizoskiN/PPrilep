-- Fix the IdeaCard upvote security hole.
--
-- BEFORE: client wrote `update({ upvotes: upvotes + 1 })` directly. That meant
--   1. Any logged-in user could set upvotes to any integer via devtools.
--   2. The same user could vote unlimited times (only blocked by local React state).
--   3. Concurrent votes race-clobbered each other.
--
-- AFTER: a join table tracks who voted on what, and an RPC enforces one vote
-- per user with SECURITY DEFINER. The `ideas.upvotes` column becomes a cache
-- updated atomically by triggers.

-- ── Table: tracks one row per (idea, user) ───────────────────────────────────
create table if not exists public.idea_upvotes (
  idea_id    bigint     not null references public.ideas(id) on delete cascade,
  user_id    uuid       not null references auth.users(id)   on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

create index if not exists idea_upvotes_user_idx on public.idea_upvotes(user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.idea_upvotes enable row level security;

-- Anyone can read who upvoted what (used by UI to show "you voted" state).
create policy "idea_upvotes_read_all"
  on public.idea_upvotes for select using (true);

-- A user can only insert/delete rows where user_id = their own id.
create policy "idea_upvotes_insert_own"
  on public.idea_upvotes for insert with check (auth.uid() = user_id);
create policy "idea_upvotes_delete_own"
  on public.idea_upvotes for delete using (auth.uid() = user_id);

-- ── Trigger: keep ideas.upvotes in sync with the join table ──────────────────
create or replace function public.sync_idea_upvotes()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.ideas set upvotes = coalesce(upvotes, 0) + 1 where id = new.idea_id;
  elsif (tg_op = 'DELETE') then
    update public.ideas set upvotes = greatest(0, coalesce(upvotes, 0) - 1) where id = old.idea_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_idea_upvotes on public.idea_upvotes;
create trigger trg_sync_idea_upvotes
  after insert or delete on public.idea_upvotes
  for each row execute function public.sync_idea_upvotes();

-- ── RPC: toggle vote, returns new state ──────────────────────────────────────
create or replace function public.toggle_idea_upvote(p_idea_id bigint)
returns table (upvotes int, voted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_exists boolean;
  v_count int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1 from public.idea_upvotes where idea_id = p_idea_id and user_id = v_user
  ) into v_exists;

  if v_exists then
    delete from public.idea_upvotes where idea_id = p_idea_id and user_id = v_user;
  else
    insert into public.idea_upvotes (idea_id, user_id) values (p_idea_id, v_user);
  end if;

  select coalesce(i.upvotes, 0) into v_count from public.ideas i where i.id = p_idea_id;

  return query select v_count, not v_exists;
end;
$$;

grant execute on function public.toggle_idea_upvote(bigint) to authenticated;

-- ── Backfill: rebuild ideas.upvotes from the (currently empty) join table ────
-- The existing upvote counts are inflated due to the security hole. We zero
-- them out so the counter reflects only real, deduplicated votes going forward.
-- Comment out the next line if you want to keep the existing inflated numbers.
update public.ideas set upvotes = 0;
