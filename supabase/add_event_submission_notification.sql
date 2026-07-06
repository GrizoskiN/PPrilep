-- Allow the "event_submission" notification type.
--
-- Fired to every admin (profiles.is_admin = true) when a citizen submits an
-- event through /events → „Пријави настан". Replaces the email alert with a
-- free in-app notification (Resend has monthly caps; notifications don't).
--
-- The type CHECK constraint is rewritten with the FULL current list so it's
-- correct regardless of which earlier migration ran last.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'issue_comment','issue_affected','issue_helper','issue_help_comment',
    'issue_help_vote','idea_upvote','comment_like','comment_reply',
    'issue_in_district','issue_status','issue_for_agency','agency_post',
    'agency_alert','issue_resolved_by_citizen','event_submission'
  ));

notify pgrst, 'reload schema';
