-- Podobar Prilep — Supabase Schema
-- Run this in the Supabase SQL editor

-- ── Profiles ──────────────────────────────────────────────────────────
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  points integer default 0,
  created_at timestamptz default now()
);

-- ── Issues ────────────────────────────────────────────────────────────
create table issues (
  id bigserial primary key,
  title text not null,
  description text,
  district text not null check (district in ('Center','Varoš','Trizla','Točila','Rid','Tri Bari')),
  category text not null check (category in ('road','water','power','garbage','park','other')),
  status text default 'open' check (status in ('open','progress','resolved')),
  photo_url text,
  reported_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Issue participants ─────────────────────────────────────────────────
create table issue_affected (
  issue_id bigint references issues(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (issue_id, user_id)
);

create table issue_helpers (
  issue_id bigint references issues(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  note text,
  primary key (issue_id, user_id)
);

-- ── Fund campaigns ────────────────────────────────────────────────────
create table fund_campaigns (
  id bigserial primary key,
  title text not null,
  description text,
  district text,
  goal_amount integer not null,
  raised_amount integer default 0,
  status text default 'active' check (status in ('active','completed','cancelled')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ── Ideas ─────────────────────────────────────────────────────────────
create table ideas (
  id bigserial primary key,
  title text not null,
  body text,
  upvotes integer default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ── Utility posts ─────────────────────────────────────────────────────
create table utility_posts (
  id bigserial primary key,
  provider text check (provider in ('water','garbage','power')),
  title text not null,
  body text,
  status text check (status in ('open','progress','resolved')),
  posted_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────
alter table profiles enable row level security;
alter table issues enable row level security;
alter table issue_affected enable row level security;
alter table issue_helpers enable row level security;
alter table fund_campaigns enable row level security;
alter table ideas enable row level security;
alter table utility_posts enable row level security;

-- Profiles
create policy "Public profiles" on profiles for select using (true);
create policy "Own profile" on profiles for update using (auth.uid() = id);

-- Issues
create policy "Public issues" on issues for select using (true);
create policy "Auth insert issue" on issues for insert with check (auth.role() = 'authenticated');
create policy "Own update issue" on issues for update using (auth.uid() = reported_by);

-- Affected / helpers
create policy "Auth affected" on issue_affected for all using (auth.role() = 'authenticated');
create policy "Auth helpers" on issue_helpers for all using (auth.role() = 'authenticated');

-- Fund campaigns
create policy "Public campaigns" on fund_campaigns for select using (true);
create policy "Auth campaign" on fund_campaigns for insert with check (auth.role() = 'authenticated');

-- Ideas
create policy "Public ideas" on ideas for select using (true);
create policy "Auth idea" on ideas for insert with check (auth.role() = 'authenticated');
create policy "Auth idea upvote" on ideas for update using (auth.role() = 'authenticated');

-- Utility posts
create policy "Public utility" on utility_posts for select using (true);

-- ── Auto-create profile on signup ─────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Storage bucket for issue photos ──────────────────────────────────
insert into storage.buckets (id, name, public) values ('issue-photos', 'issue-photos', true);

create policy "Public read photos" on storage.objects
  for select using (bucket_id = 'issue-photos');

create policy "Auth upload photos" on storage.objects
  for insert with check (bucket_id = 'issue-photos' and auth.role() = 'authenticated');
