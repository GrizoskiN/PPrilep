-- Add multi-comment support + owner delete policy for issues

begin;

-- Ensure issue owners can delete their own posts
drop policy if exists "Own delete issue" on public.issues;
create policy "Own delete issue" on public.issues
  for delete using (auth.uid() = reported_by);

-- Dedicated comments table (separate from helpers)
create table if not exists public.issue_comments (
  id bigserial primary key,
  issue_id bigint not null references public.issues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint issue_comments_body_not_blank check (length(trim(body)) > 0)
);

create index if not exists issue_comments_issue_created_idx
  on public.issue_comments(issue_id, created_at desc);

create index if not exists issue_comments_user_created_idx
  on public.issue_comments(user_id, created_at desc);

alter table public.issue_comments enable row level security;

drop policy if exists "Public read issue comments" on public.issue_comments;
create policy "Public read issue comments" on public.issue_comments
  for select using (true);

drop policy if exists "Auth insert own issue comments" on public.issue_comments;
create policy "Auth insert own issue comments" on public.issue_comments
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "Own update issue comments" on public.issue_comments;
create policy "Own update issue comments" on public.issue_comments
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Own delete issue comments" on public.issue_comments;
create policy "Own delete issue comments" on public.issue_comments
  for delete using (auth.uid() = user_id);

commit;
