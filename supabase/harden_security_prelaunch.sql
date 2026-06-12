-- ════════════════════════════════════════════════════════════════════════════
--  Pre-launch security hardening.  Run ONCE in the Supabase SQL editor.
--
--  Fixes three issues found during the pre-launch security review:
--
--  1. [HIGH] agency_set_issue_status() let ANY anonymous caller change any
--     issue's status (and spam a notification to the reporter).
--     Root cause: the guard
--         if not (is_admin() or reported_by = auth.uid() or handles_category())
--     For an anonymous caller auth.uid() is NULL, so `reported_by = NULL`
--     evaluates to NULL, the whole OR is NULL, and `not NULL` is NULL — which
--     is NOT true, so the `raise exception` never fires → the check fails OPEN.
--
--  2. [MED] Every SECURITY DEFINER function keeps Postgres' default
--     `EXECUTE … to PUBLIC` grant. The migrations only ADDED a grant to
--     `authenticated`; they never REVOKED the default, so `anon` can invoke
--     them. Defense in depth: revoke PUBLIC, grant only the roles that need it.
--
--  3. [MED/privacy] profiles.street_name and profiles.district (a citizen's
--     home location) were world-readable through the public REST API for every
--     user. Only the owner's own /account page needs them, and that runs as the
--     `authenticated` role — so revoke these two columns from `anon`.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Fix the fail-open authorisation check ─────────────────────────────────
create or replace function public.agency_set_issue_status(
  p_issue_id bigint,
  p_status   text,
  p_note     text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_issue   public.issues;
  v_agency  text;
  v_uid     uuid := auth.uid();
begin
  -- Must be logged in. This single guard closes the NULL-comparison hole:
  -- with no authenticated user there is no legitimate caller.
  if v_uid is null then
    raise exception 'Not authorised to change this status';
  end if;

  select * into v_issue from public.issues where id = p_issue_id;
  if not found then
    raise exception 'Issue not found';
  end if;

  if p_status not in ('open','acknowledged','progress','pending','resolved') then
    raise exception 'Invalid status %', p_status;
  end if;

  -- Authorisation: admin, the issue owner, or the agency that handles the
  -- issue's category. coalesce() guards against any NULL short-circuit.
  if not (
       public.is_admin()
    or coalesce(v_issue.reported_by = v_uid, false)
    or public.user_handles_category(v_issue.category::text)
  ) then
    raise exception 'Not authorised to change this status';
  end if;

  -- No-op: same status and no note (prevents duplicate log rows).
  if v_issue.status = p_status
     and nullif(trim(coalesce(p_note,'')), '') is null then
    return;
  end if;

  v_agency := public.current_user_agency();

  update public.issues
     set status = p_status,
         resolved_by = case when p_status = 'resolved' then resolved_by else null end,
         updated_at = now()
   where id = p_issue_id;

  insert into public.issue_status_log (issue_id, status, note, changed_by, agency_id)
  values (p_issue_id, p_status, nullif(trim(coalesce(p_note,'')), ''), v_uid, v_agency);

  -- Notify the reporter (skip if they changed it themselves).
  if v_issue.reported_by is not null and v_issue.reported_by <> v_uid then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, title, body, link)
    values (
      v_issue.reported_by,
      v_uid,
      'issue_status',
      v_issue.title,
      'Статусот на твојата пријава е променет',
      public.make_issue_path(v_issue.id, v_issue.title)
    );
  end if;
end;
$$;

-- ── 2. Revoke the default PUBLIC execute grant on privileged functions ───────
--     (then re-grant only to the role that legitimately calls each one)

-- Caller-mutating RPCs — only authenticated users may call them.
revoke execute on function public.agency_set_issue_status(bigint, text, text) from public;
grant  execute on function public.agency_set_issue_status(bigint, text, text) to authenticated;

revoke execute on function public.create_agency_post(text, text, text, text, text[], boolean) from public;
grant  execute on function public.create_agency_post(text, text, text, text, text[], boolean) to authenticated;

revoke execute on function public.update_agency_post(bigint, text, text) from public;
grant  execute on function public.update_agency_post(bigint, text, text) to authenticated;

revoke execute on function public.delete_agency_post(bigint) from public;
grant  execute on function public.delete_agency_post(bigint) to authenticated;

revoke execute on function public.toggle_idea_upvote(bigint)      from public;
grant  execute on function public.toggle_idea_upvote(bigint)      to authenticated;
revoke execute on function public.toggle_initiative_vote(uuid)    from public;
grant  execute on function public.toggle_initiative_vote(uuid)    to authenticated;

-- Maintenance function — pg_cron runs it as the table owner; no client ever
-- needs to call it. Lock it down to the owner only.
revoke execute on function public.expire_monthly_memberships() from public;

-- NOTE: is_admin(), current_user_agency(), agency_for_category(),
-- user_handles_category() are read-only helpers that return false/null for a
-- non-privileged caller. They are harmless to expose, but if you want to be
-- strict you can also `revoke execute … from public` and grant to authenticated.

-- ── 3. Stop anonymous scraping of citizens' home location ────────────────────
revoke select (street_name, district) on public.profiles from anon;
-- `authenticated` keeps access so each user can read their own /account fields.

-- ── Refresh PostgREST so the new privileges take effect immediately ──────────
notify pgrst, 'reload schema';
