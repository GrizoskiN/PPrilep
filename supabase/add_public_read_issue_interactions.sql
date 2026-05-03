-- Allow visitors (anon) to see interaction counts while keeping writes authenticated.

alter table public.issue_affected enable row level security;
alter table public.issue_helpers enable row level security;

drop policy if exists "Auth affected" on public.issue_affected;
drop policy if exists "Auth helpers" on public.issue_helpers;

-- issue_affected: anyone can read, only authenticated users can create/delete their own row.
create policy "Public read issue affected" on public.issue_affected
for select using (true);

create policy "Auth insert own issue affected" on public.issue_affected
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Own delete issue affected" on public.issue_affected
for delete
using (auth.uid() = user_id);

-- issue_helpers: anyone can read, only authenticated users can create/update/delete their own row.
create policy "Public read issue helpers" on public.issue_helpers
for select using (true);

create policy "Auth insert own issue helper" on public.issue_helpers
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Own update issue helper" on public.issue_helpers
for update
using (auth.uid() = user_id);

create policy "Own delete issue helper" on public.issue_helpers
for delete
using (auth.uid() = user_id);
