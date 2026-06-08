-- Notify users when a NEW issue is reported in their district.
-- Opt-in via profiles.notif_local_issues (default ON). The reporter is never
-- notified about their own report.

-- 1) Preference column. AuthContext fetches the profile with select('*'), so it
--    flows through to the client automatically.
alter table public.profiles
  add column if not exists notif_local_issues boolean not null default true;

-- 2) Allow the new notification type.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'issue_comment','issue_affected','issue_helper','issue_help_comment',
    'issue_help_vote','idea_upvote','comment_like','comment_reply','issue_in_district'
  ));

-- 3) On new issue, notify everyone whose district matches — except the reporter
--    and anyone who opted out.
create or replace function public.notify_on_new_issue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reported_by is null or new.district is null then
    return new;
  end if;

  insert into public.notifications (recipient_user_id, actor_user_id, type, title, body, link)
  select p.id,
         new.reported_by,
         'issue_in_district',
         new.title,
         'пријави нов проблем во твојата населба',
         public.make_issue_path(new.id, new.title)
  from public.profiles p
  where p.district = new.district
    and p.id <> new.reported_by
    and coalesce(p.notif_local_issues, true) = true;

  return new;
end;
$$;

-- 4) Trigger.
drop trigger if exists trg_notify_new_issue on public.issues;
create trigger trg_notify_new_issue
after insert on public.issues
for each row execute function public.notify_on_new_issue();
