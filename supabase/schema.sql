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
  district text not null check (district in ('Center','Varoš','Trizla','Točila','Rid','Tipski','Boncejca')),
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

create table issue_comments (
  id bigserial primary key,
  issue_id bigint not null references issues(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
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
  street_name text,
  district text check (district in ('Center','Varoš','Trizla','Točila','Rid','Tipski','Boncejca','KorzoMaalo')),
  lat double precision,
  lng double precision,
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
  source_url text,
  status text check (status in ('open','progress','resolved')),
  posted_at timestamptz default now()
);

-- ── Notifications ─────────────────────────────────────────────────────
create table notifications (
  id bigserial primary key,
  recipient_user_id uuid not null references profiles(id) on delete cascade,
  actor_user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('issue_comment','issue_affected','issue_helper','issue_help_comment','issue_help_vote','idea_upvote')),
  title text not null,
  body text not null,
  link text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────
alter table profiles enable row level security;
alter table issues enable row level security;
alter table issue_affected enable row level security;
alter table issue_helpers enable row level security;
alter table issue_comments enable row level security;
alter table fund_campaigns enable row level security;
alter table ideas enable row level security;
alter table utility_posts enable row level security;
alter table notifications enable row level security;

-- Profiles
create policy "Public profiles" on profiles for select using (true);
create policy "Own profile" on profiles for update using (auth.uid() = id);

-- Issues
create policy "Public issues" on issues for select using (true);
create policy "Auth insert issue" on issues for insert with check (auth.role() = 'authenticated');
create policy "Own update issue" on issues for update using (auth.uid() = reported_by);
create policy "Own delete issue" on issues for delete using (auth.uid() = reported_by);

-- Affected / helpers
create policy "Public read issue affected" on issue_affected for select using (true);
create policy "Auth insert own issue affected" on issue_affected for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "Own delete issue affected" on issue_affected for delete using (auth.uid() = user_id);

create policy "Public read issue helpers" on issue_helpers for select using (true);
create policy "Auth insert own issue helper" on issue_helpers for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "Own update issue helper" on issue_helpers for update using (auth.uid() = user_id);
create policy "Own delete issue helper" on issue_helpers for delete using (auth.uid() = user_id);

-- Comments
create policy "Public comments" on issue_comments for select using (true);
create policy "Auth insert comment" on issue_comments for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "Own update comment" on issue_comments for update using (auth.uid() = user_id);
create policy "Own delete comment" on issue_comments for delete using (auth.uid() = user_id);

-- Fund campaigns
create policy "Public campaigns" on fund_campaigns for select using (true);
create policy "Auth campaign" on fund_campaigns for insert with check (auth.role() = 'authenticated');

-- Ideas
create policy "Public ideas" on ideas for select using (true);
create policy "Auth idea" on ideas for insert with check (auth.role() = 'authenticated');
create policy "Auth idea upvote" on ideas for update using (auth.role() = 'authenticated');

-- Utility posts
create policy "Public utility" on utility_posts for select using (true);

-- Notifications
create policy "Own read notifications" on notifications for select using (auth.uid() = recipient_user_id);
create policy "Actor insert notifications" on notifications for insert with check (auth.role() = 'authenticated' and auth.uid() = actor_user_id);
create policy "Own update notifications" on notifications for update using (auth.uid() = recipient_user_id);

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
insert into storage.buckets (id, name, public)
values ('issue-photos', 'issue-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read photos" on storage.objects;
create policy "Public read photos" on storage.objects
  for select using (bucket_id = 'issue-photos');

drop policy if exists "Auth upload photos" on storage.objects;
create policy "Auth upload photos" on storage.objects
  for insert with check (bucket_id = 'issue-photos' and auth.role() = 'authenticated');
