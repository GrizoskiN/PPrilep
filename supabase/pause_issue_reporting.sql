-- Pause NEW issue reporting with a HUMAN-READABLE message.
--
-- An RLS denial returns a fixed English string ("new row violates row-level
-- security policy") that we can't customise. A BEFORE INSERT trigger can raise
-- any message we like, and PostgREST passes it through as error.message — which
-- the mobile IssueForm already renders verbatim. So the shipped app shows a
-- proper Macedonian explanation with no rebuild / EAS update needed.
--
-- Admins are exempt so you can still test.
-- Everything else (comments, applause, initiatives, ideas, events, buses) is
-- untouched — only INSERT into public.issues is blocked.
--
-- Reverse with restore_issue_reporting.sql.

-- Keep the ordinary RLS policy permissive: the trigger is what blocks, and only
-- the trigger produces a readable message.
drop policy if exists "Admin insert issue" on public.issues;
drop policy if exists "Auth insert issue"  on public.issues;

create policy "Auth insert issue" on public.issues
  for insert
  with check (auth.role() = 'authenticated');

create or replace function public.block_issue_reporting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  ) then
    return new;
  end if;

  raise exception
    'Пријавувањето проблеми е привремено паузирано. Работиме на надградба и наскоро повторно ќе биде достапно. Ви благодариме на разбирањето! 🙏'
    using errcode = 'P0001';
end;
$$;

drop trigger if exists trg_block_issue_reporting on public.issues;
create trigger trg_block_issue_reporting
  before insert on public.issues
  for each row
  execute function public.block_issue_reporting();
