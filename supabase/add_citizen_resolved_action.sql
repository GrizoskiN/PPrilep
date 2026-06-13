-- ════════════════════════════════════════════════════════════════════════════
--  Civic action — "I already solved it" reports
--
--  A citizen can report a problem they have ALREADY fixed themselves (e.g. "I cut
--  the grass myself"). Such an issue is inserted directly as status='resolved'
--  with resolved_by = the citizen, a "before" photo (photo_url) and an "after"
--  photo (after_photo_url). It still picks a category, so it is still routed to
--  the responsible institution — but as a gentle FYI, not a task in their queue.
--
--  No new tables or columns: this reuses status / resolved_by / photo_url /
--  after_photo_url, which already drive the "решено од граѓанин" badge, resolver
--  credit and applause upvotes.
--
--  This migration only re-words the two existing after-insert notification
--  triggers so they detect a "born resolved" row and notify with the right copy.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Allow the new notification type ───────────────────────────────────────
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'issue_comment','issue_affected','issue_helper','issue_help_comment',
    'issue_help_vote','idea_upvote','comment_like','comment_reply',
    'issue_in_district','issue_status','issue_for_agency',
    'agency_post','agency_alert','issue_resolved_by_citizen'
  ));

-- ── 2. Agency routing: gentle FYI when the issue is already solved ────────────
create or replace function public.notify_agency_on_new_issue()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_agency   text;
  v_resolved boolean := new.status = 'resolved' and new.resolved_by is not null;
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
         case when v_resolved then 'issue_resolved_by_citizen'
              else 'issue_for_agency' end,
         new.title,
         case when v_resolved then 'Граѓанин веќе реши проблем во ваша надлежност 👏'
              else 'Нова пријава во ваша надлежност' end,
         public.make_issue_path(new.id, new.title)
  from public.profiles p
  where p.agency_id = v_agency
    and p.id <> new.reported_by;

  return new;
end;
$$;

-- ── 3. District neighbours: frame a solved action as positive, not a problem ──
create or replace function public.notify_on_new_issue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resolved boolean := new.status = 'resolved' and new.resolved_by is not null;
begin
  if new.reported_by is null or new.district is null then
    return new;
  end if;

  insert into public.notifications (recipient_user_id, actor_user_id, type, title, body, link)
  select p.id,
         new.reported_by,
         'issue_in_district',
         new.title,
         case when v_resolved then 'сподели граѓанска акција во твојата населба'
              else 'пријави нов проблем во твојата населба' end,
         public.make_issue_path(new.id, new.title)
  from public.profiles p
  where p.district = new.district
    and p.id <> new.reported_by
    and coalesce(p.notif_local_issues, true) = true;

  return new;
end;
$$;

notify pgrst, 'reload schema';
