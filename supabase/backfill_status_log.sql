-- ════════════════════════════════════════════════════════════════════════════
--  One-time backfill — sync issue_status_log with issues.status
--
--  Before the mobile edit form routed status changes through
--  agency_set_issue_status, it wrote issues.status directly and never appended a
--  history row. So issues resolved (or moved to progress/etc.) from mobile show
--  the right pill on the card but an empty/stale status-timeline drawer, which
--  falls back to the fabricated "Пријавено" step.
--
--  This adds a single history row for any non-open issue whose latest log entry
--  doesn't already match its current status. 'open' is the implicit default and
--  needs no row. Safe to re-run: it only inserts where the latest log status
--  differs from the current status.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.issue_status_log (issue_id, status, note, changed_by, created_at)
select
  i.id,
  i.status,
  null,
  i.reported_by,
  coalesce(i.updated_at, i.created_at)
from public.issues i
left join lateral (
  select l.status
  from public.issue_status_log l
  where l.issue_id = i.id
  order by l.created_at desc
  limit 1
) latest on true
where i.status <> 'open'
  and (latest.status is null or latest.status <> i.status);
