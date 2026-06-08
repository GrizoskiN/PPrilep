-- Fix "Database error deleting user" when removing an auth user.
--
-- Two foreign keys pointed at auth.users / profiles with the default ON DELETE
-- rule (NO ACTION), which blocks deleting a user that has any related rows:
--   • issue_change_requests.requester_user_id → auth.users
--   • comment_reports.reported_by            → profiles
--
-- These are the user's own moderation/request actions, so they should be
-- removed together with the user (CASCADE) — matching comments, votes, etc.
-- Run once in the Supabase SQL editor.

alter table public.issue_change_requests
  drop constraint issue_change_requests_requester_user_id_fkey,
  add  constraint issue_change_requests_requester_user_id_fkey
    foreign key (requester_user_id) references auth.users(id) on delete cascade;

alter table public.comment_reports
  drop constraint comment_reports_reported_by_fkey,
  add  constraint comment_reports_reported_by_fkey
    foreign key (reported_by) references public.profiles(id) on delete cascade;
