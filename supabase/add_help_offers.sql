-- Help planning: first-helper date + upvotes + offer comments

begin;

create table if not exists public.issue_help_offers (
  id bigserial primary key,
  issue_id bigint not null references public.issues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  service_date date,
  created_at timestamptz not null default now(),
  unique (issue_id, user_id)
);

create index if not exists issue_help_offers_issue_created_idx
  on public.issue_help_offers(issue_id, created_at asc);

create table if not exists public.issue_help_date_votes (
  offer_id bigint not null references public.issue_help_offers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (offer_id, user_id)
);

create index if not exists issue_help_date_votes_offer_idx
  on public.issue_help_date_votes(offer_id);

create table if not exists public.issue_help_offer_comments (
  id bigserial primary key,
  offer_id bigint not null references public.issue_help_offers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint issue_help_offer_comments_body_not_blank check (length(trim(body)) > 0)
);

create index if not exists issue_help_offer_comments_offer_created_idx
  on public.issue_help_offer_comments(offer_id, created_at asc);

-- Rule: only first helper on an issue may set a date
create or replace function public.enforce_first_helper_date()
returns trigger
language plpgsql
as $$
declare
  first_offer_id bigint;
begin
  if new.service_date is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if exists (
      select 1 from public.issue_help_offers
      where issue_id = new.issue_id
    ) then
      raise exception 'Only the first helper can set a date.';
    end if;
    return new;
  end if;

  select id into first_offer_id
  from public.issue_help_offers
  where issue_id = new.issue_id
  order by created_at asc, id asc
  limit 1;

  if first_offer_id is not null and first_offer_id <> new.id then
    raise exception 'Only the first helper can set a date.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_first_helper_date on public.issue_help_offers;
create trigger trg_enforce_first_helper_date
before insert or update on public.issue_help_offers
for each row
execute function public.enforce_first_helper_date();

alter table public.issue_help_offers enable row level security;
alter table public.issue_help_date_votes enable row level security;
alter table public.issue_help_offer_comments enable row level security;

drop policy if exists "Public read help offers" on public.issue_help_offers;
create policy "Public read help offers" on public.issue_help_offers
  for select using (true);

drop policy if exists "Auth insert own help offer" on public.issue_help_offers;
create policy "Auth insert own help offer" on public.issue_help_offers
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "Own update help offer" on public.issue_help_offers;
create policy "Own update help offer" on public.issue_help_offers
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Own delete help offer" on public.issue_help_offers;
create policy "Own delete help offer" on public.issue_help_offers
  for delete using (auth.uid() = user_id);

drop policy if exists "Public read help votes" on public.issue_help_date_votes;
create policy "Public read help votes" on public.issue_help_date_votes
  for select using (true);

drop policy if exists "Auth vote help date" on public.issue_help_date_votes;
create policy "Auth vote help date" on public.issue_help_date_votes
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "Own remove help vote" on public.issue_help_date_votes;
create policy "Own remove help vote" on public.issue_help_date_votes
  for delete using (auth.uid() = user_id);

drop policy if exists "Public read help offer comments" on public.issue_help_offer_comments;
create policy "Public read help offer comments" on public.issue_help_offer_comments
  for select using (true);

drop policy if exists "Auth insert own help offer comment" on public.issue_help_offer_comments;
create policy "Auth insert own help offer comment" on public.issue_help_offer_comments
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "Own update help offer comment" on public.issue_help_offer_comments;
create policy "Own update help offer comment" on public.issue_help_offer_comments
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Own delete help offer comment" on public.issue_help_offer_comments;
create policy "Own delete help offer comment" on public.issue_help_offer_comments
  for delete using (auth.uid() = user_id);

commit;
