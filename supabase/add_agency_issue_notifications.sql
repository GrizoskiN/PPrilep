-- ════════════════════════════════════════════════════════════════════════════
--  Phase 4 — Route new issues to the responsible institution
--
--  When a new issue is created, notify the operator account(s) of the agency
--  that handles that category. Runs alongside the existing district trigger.
--
--  Run ONCE in the Supabase SQL editor (after add_agencies.sql + status stages).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Allow the new notification types ──────────────────────────────────────
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'issue_comment','issue_affected','issue_helper','issue_help_comment',
    'issue_help_vote','idea_upvote','comment_like','comment_reply',
    'issue_in_district','issue_status','issue_for_agency',
    'agency_post','agency_alert'
  ));

-- ── 2. On new issue, notify the responsible institution's account(s) ─────────
create or replace function public.notify_agency_on_new_issue()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_agency text;
begin
  if new.reported_by is null then
    return new;
  end if;

  v_agency := public.agency_for_category(new.category::text);
  if v_agency is null then
    return new;
  end if;

  insert into public.notifications
    (recipient_user_id, actor_user_id, type, title, body, link)
  select p.id,
         new.reported_by,
         'issue_for_agency',
         new.title,
         'Нова пријава во ваша надлежност',
         public.make_issue_path(new.id, new.title)
  from public.profiles p
  where p.agency_id = v_agency
    and p.id <> new.reported_by;

  return new;
end;
$$;

drop trigger if exists trg_notify_agency_new_issue on public.issues;
create trigger trg_notify_agency_new_issue
  after insert on public.issues
  for each row execute function public.notify_agency_on_new_issue();
