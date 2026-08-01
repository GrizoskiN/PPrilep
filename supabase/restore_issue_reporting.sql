-- Undo pause_issue_reporting.sql — any authenticated user can report again.

drop trigger  if exists trg_block_issue_reporting on public.issues;
drop function if exists public.block_issue_reporting();

drop policy if exists "Admin insert issue" on public.issues;
drop policy if exists "Auth insert issue"  on public.issues;

create policy "Auth insert issue" on public.issues
  for insert
  with check (auth.role() = 'authenticated');
