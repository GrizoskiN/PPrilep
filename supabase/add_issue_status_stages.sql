-- ════════════════════════════════════════════════════════════════════════════
--  Phase 2 — Precise issue status + persisted status timeline
--
--  Status grows from 3 → 5 stages. Operators (agency accounts), the issue owner,
--  and admins advance the status through a SECURITY DEFINER RPC that also writes
--  an append-only history row and notifies the reporter.
--
--  Run ONCE in the Supabase SQL editor (after add_agencies.sql).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Widen the status check constraint ─────────────────────────────────────
--  open=Пријавено, acknowledged=Видено, progress=Се работи, pending=На чекање,
--  resolved=Решено. Existing rows are open/progress/resolved → still valid.
alter table public.issues drop constraint if exists issues_status_check;
alter table public.issues add constraint issues_status_check
  check (status in ('open','acknowledged','progress','pending','resolved'));

-- ── 2. Append-only status history ────────────────────────────────────────────
create table if not exists public.issue_status_log (
  id         bigserial primary key,
  issue_id   bigint not null references public.issues(id) on delete cascade,
  status     text   not null,
  note       text,
  changed_by uuid   references public.profiles(id) on delete set null,
  agency_id  text   references public.agencies(id),
  created_at timestamptz not null default now()
);

create index if not exists issue_status_log_issue_idx
  on public.issue_status_log(issue_id, created_at);

alter table public.issue_status_log enable row level security;
drop policy if exists "Public read status log" on public.issue_status_log;
create policy "Public read status log" on public.issue_status_log
  for select using (true);

-- ── 3. RPC: advance status (operator / owner / admin) ────────────────────────
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
begin
  select * into v_issue from public.issues where id = p_issue_id;
  if not found then
    raise exception 'Issue not found';
  end if;

  if p_status not in ('open','acknowledged','progress','pending','resolved') then
    raise exception 'Invalid status %', p_status;
  end if;

  -- Authorisation: admin, the issue owner, or the agency that handles the
  -- issue's category.
  if not (
       public.is_admin()
    or v_issue.reported_by = auth.uid()
    or public.user_handles_category(v_issue.category::text)
  ) then
    raise exception 'Not authorised to change this status';
  end if;

  -- No-op: same status and no note (prevents duplicate log rows, e.g. the
  -- client auto-acknowledge firing twice on a double mount).
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
  values (p_issue_id, p_status, nullif(trim(coalesce(p_note,'')), ''), auth.uid(), v_agency);

  -- Notify the reporter (skip if they changed it themselves).
  if v_issue.reported_by is not null and v_issue.reported_by <> auth.uid() then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, title, body, link)
    values (
      v_issue.reported_by,
      auth.uid(),
      'issue_status',
      v_issue.title,
      'Статусот на твојата пријава е променет',
      public.make_issue_path(v_issue.id, v_issue.title)
    );
  end if;
end;
$$;
grant execute on function public.agency_set_issue_status(bigint, text, text) to authenticated;

-- ── 4. Allow the new notification type ───────────────────────────────────────
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'issue_comment','issue_affected','issue_helper','issue_help_comment',
    'issue_help_vote','idea_upvote','comment_like','comment_reply',
    'issue_in_district','issue_status'
  ));
