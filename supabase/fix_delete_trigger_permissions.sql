-- Fix "permission denied for table initiatives" (42501) when deleting a user.
--
-- Root cause: deleting an auth user runs as the `supabase_auth_admin` role.
-- The cascade delete removes the user's initiative_votes / idea_upvotes rows,
-- which fire AFTER DELETE triggers that UPDATE public.initiatives / public.ideas
-- to keep the cached vote counts in sync. Those trigger functions were NOT
-- SECURITY DEFINER, so they ran as supabase_auth_admin — which has no GRANT on
-- those tables — and failed, aborting the whole delete.
--
-- Fix: run these count-sync triggers as SECURITY DEFINER (owner's rights), the
-- same as their toggle_* RPC counterparts already are. search_path is pinned so
-- SECURITY DEFINER is safe. Idempotent. Run once in the Supabase SQL editor.

alter function public.sync_initiative_votes()
  security definer
  set search_path = public, pg_temp;

alter function public.sync_idea_upvotes()
  security definer
  set search_path = public, pg_temp;
