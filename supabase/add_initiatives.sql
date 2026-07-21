-- ── Initiatives: 4-stage civic pipeline (+ rejected) ─────────────────
-- idea → voting → funding → completed   (rejected = dead end)
--
-- ⚠ Drops and recreates the initiatives tables/enums. Safe pre-launch
-- because no real data exists yet. If you ever ship this and need to
-- migrate, replace the drops with ALTER TABLE ADD COLUMN IF NOT EXISTS.

drop view  if exists public.initiatives_with_details;
drop table if exists public.initiative_votes cascade;
drop table if exists public.initiatives      cascade;
drop type  if exists public.initiative_stage    cascade;
drop type  if exists public.initiative_category cascade;

-- ── Enums ──────────────────────────────────────────────────────────────
create type initiative_stage    as enum ('idea','voting','funding','completed','rejected');
create type initiative_category as enum (
  'infrastructure','education','environment','culture','safety','health','other'
);

-- ── Table: initiatives ────────────────────────────────────────────────
create table if not exists public.initiatives (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  title               text not null check (char_length(title) between 10 and 120),
  description         text not null check (char_length(description) between 50 and 2000),
  category            initiative_category not null default 'other',
  stage               initiative_stage not null default 'idea',
  vote_count          integer not null default 0,
  vote_threshold      integer not null default 100,
  district            text check (district in ('Center','Varoš','Trizla','Točila','Rid','Tipski','Boncejca','KorzoMaalo')),
  street_name         text,
  cover_image_url     text,
  image_urls          text[] not null default '{}',
  problem_statement   text check (problem_statement is null or char_length(problem_statement) <= 500),
  expected_impact     text check (expected_impact   is null or char_length(expected_impact)   <= 500),
  target_amount       numeric,
  raised_amount       numeric not null default 0,
  funding_deadline    timestamptz,
  completed_at        timestamptz,
  completion_note     text,
  completion_images   text[] not null default '{}',
  sanity_doc_id       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists initiatives_stage_idx       on public.initiatives(stage);
create index if not exists initiatives_user_idx        on public.initiatives(user_id);
create index if not exists initiatives_created_at_idx  on public.initiatives(created_at desc);
create index if not exists initiatives_completed_at_idx on public.initiatives(completed_at desc);

-- updated_at trigger
create or replace function public.touch_initiatives_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists trg_touch_initiatives on public.initiatives;
create trigger trg_touch_initiatives
  before update on public.initiatives
  for each row execute function public.touch_initiatives_updated_at();

-- ── Vote join table ──────────────────────────────────────────────────
create table if not exists public.initiative_votes (
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  user_id       uuid not null references public.profiles(id)    on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (initiative_id, user_id)
);

create index if not exists initiative_votes_user_idx on public.initiative_votes(user_id);

-- ── Trigger: keep initiatives.vote_count synced + auto-promote ──────
create or replace function public.sync_initiative_votes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count     integer;
  v_stage     initiative_stage;
  v_threshold integer;
begin
  if tg_op = 'INSERT' then
    update public.initiatives
       set vote_count = coalesce(vote_count,0) + 1
     where id = new.initiative_id
    returning vote_count, stage, vote_threshold into v_count, v_stage, v_threshold;

    -- Auto-promote idea → voting at half threshold, voting → funding at full.
    if v_stage = 'idea' and v_count >= greatest(1, v_threshold / 2) then
      update public.initiatives set stage = 'voting' where id = new.initiative_id;
    end if;
    if v_stage in ('idea','voting') and v_count >= v_threshold then
      update public.initiatives set stage = 'funding' where id = new.initiative_id;
    end if;

  elsif tg_op = 'DELETE' then
    update public.initiatives
       set vote_count = greatest(0, coalesce(vote_count,0) - 1)
     where id = old.initiative_id;
  end if;
  return null;
end$$;

drop trigger if exists trg_sync_initiative_votes on public.initiative_votes;
create trigger trg_sync_initiative_votes
  after insert or delete on public.initiative_votes
  for each row execute function public.sync_initiative_votes();

-- ── RPC: toggle vote (auth-enforced, returns new state) ─────────────
create or replace function public.toggle_initiative_vote(p_initiative_id uuid)
returns table (vote_count int, voted boolean)
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
    select 1 from public.initiative_votes
     where initiative_id = p_initiative_id and user_id = v_user
  ) into v_exists;

  if v_exists then
    delete from public.initiative_votes
     where initiative_id = p_initiative_id and user_id = v_user;
  else
    insert into public.initiative_votes (initiative_id, user_id)
    values (p_initiative_id, v_user);
  end if;

  select coalesce(i.vote_count, 0) into v_count
    from public.initiatives i where i.id = p_initiative_id;

  return query select v_count, not v_exists;
end$$;

grant execute on function public.toggle_initiative_vote(uuid) to authenticated;

-- ── View: initiatives_with_details (author + computed pcts) ─────────
create or replace view public.initiatives_with_details as
select
  i.*,
  p.username                                 as author_username,
  p.full_name                                as author_full_name,
  p.avatar_url                               as author_avatar,
  case
    when i.vote_threshold > 0
      then least(100, round((i.vote_count::numeric / i.vote_threshold) * 100))::int
    else 0
  end                                         as vote_progress_pct,
  case
    when i.target_amount is not null and i.target_amount > 0
      then least(100, round((i.raised_amount / i.target_amount) * 100))::int
    else 0
  end                                         as fund_progress_pct,
  (select count(*)::int from public.initiative_votes v
    where v.initiative_id = i.id)            as supporter_count
from public.initiatives i
left join public.profiles p on p.id = i.user_id;

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.initiatives      enable row level security;
alter table public.initiative_votes enable row level security;

drop policy if exists "Public initiatives"     on public.initiatives;
create policy "Public initiatives" on public.initiatives
  for select using (true);

drop policy if exists "Auth insert initiative" on public.initiatives;
create policy "Auth insert initiative" on public.initiatives
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "Own update initiative" on public.initiatives;
create policy "Own update initiative" on public.initiatives
  for update using (auth.uid() = user_id);

drop policy if exists "Own delete initiative" on public.initiatives;
create policy "Own delete initiative" on public.initiatives
  for delete using (auth.uid() = user_id);

drop policy if exists "Public read votes"      on public.initiative_votes;
create policy "Public read votes" on public.initiative_votes
  for select using (true);

drop policy if exists "Auth insert own vote"   on public.initiative_votes;
create policy "Auth insert own vote" on public.initiative_votes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Own delete vote"        on public.initiative_votes;
create policy "Own delete vote" on public.initiative_votes
  for delete using (auth.uid() = user_id);

-- ── Storage bucket for initiative images ────────────────────────────
insert into storage.buckets (id, name, public)
values ('initiative-images','initiative-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read initiative images" on storage.objects;
create policy "Public read initiative images" on storage.objects
  for select using (bucket_id = 'initiative-images');

drop policy if exists "Auth upload initiative images" on storage.objects;
create policy "Auth upload initiative images" on storage.objects
  for insert with check (
    bucket_id = 'initiative-images'
    and auth.role() = 'authenticated'
  );

drop policy if exists "Own delete initiative images" on storage.objects;
create policy "Own delete initiative images" on storage.objects
  for delete using (
    bucket_id = 'initiative-images'
    and owner = auth.uid()
  );
