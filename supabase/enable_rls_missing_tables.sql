-- Fix: enable RLS on tables created via the Supabase dashboard without it.
-- Run this once in the Supabase SQL editor.

-- ── comment_likes ─────────────────────────────────────────────────────────────
-- Schema: comment_id bigint, user_id uuid (PK on both)
alter table public.comment_likes enable row level security;

create policy "Public read comment likes"
  on public.comment_likes for select using (true);

create policy "Auth insert own comment like"
  on public.comment_likes for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Own delete comment like"
  on public.comment_likes for delete
  using (auth.uid() = user_id);

-- ── issue_resolution_upvotes ──────────────────────────────────────────────────
-- Schema: issue_id bigint, user_id uuid (PK on both)
alter table public.issue_resolution_upvotes enable row level security;

create policy "Public read resolution upvotes"
  on public.issue_resolution_upvotes for select using (true);

create policy "Auth insert own resolution upvote"
  on public.issue_resolution_upvotes for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Own delete resolution upvote"
  on public.issue_resolution_upvotes for delete
  using (auth.uid() = user_id);

-- ── comment_reports ───────────────────────────────────────────────────────────
-- Schema: comment_id bigint, issue_id bigint, reported_by uuid
-- Reports are write-only for users (no public read — only admins should see them).
alter table public.comment_reports enable row level security;

create policy "Auth insert own comment report"
  on public.comment_reports for insert
  with check (auth.role() = 'authenticated' and auth.uid() = reported_by);
