-- ============================================================================
-- Which of the scripts in this folder have actually been run?
--
-- Read-only. Paste the whole file into the Supabase SQL editor and run it.
-- Nothing here creates, alters or drops anything.
--
-- It is deliberately ONE statement: the SQL editor only renders the result of
-- the last statement in a script, so several queries would silently hide all
-- but the final answer.
--
-- Why this exists: these files are applied by hand, and there is no record of
-- which ones were. `add_push_subscriptions.sql` sat unapplied for weeks while
-- the app cheerfully reported that push notifications were switched on — the
-- table simply wasn't there. This is how that gets caught in ten seconds.
--
-- After running it, update APPLIED.md so the next person doesn't have to guess.
-- ============================================================================

with expected(source_file, kind, name) as (
  values
    -- ── Tables ──────────────────────────────────────────────────────────────
    ('schema.sql',                 'table', 'profiles'),
    ('schema.sql',                 'table', 'issues'),
    ('add_agencies.sql',           'table', 'agencies'),
    ('add_agencies.sql',           'table', 'agency_categories'),
    ('add_agency_posts.sql',       'table', 'agency_posts'),
    ('add_bus_fleet.sql',          'table', 'buses'),
    ('add_event_interest.sql',     'table', 'event_interest'),
    ('add_help_offers.sql',        'table', 'issue_help_offers'),
    ('add_help_offers.sql',        'table', 'issue_help_date_votes'),
    ('add_help_offers.sql',        'table', 'issue_help_offer_comments'),
    ('add_idea_upvotes.sql',       'table', 'idea_upvotes'),
    ('add_initiatives.sql',        'table', 'initiatives'),
    ('add_initiatives.sql',        'table', 'initiative_votes'),
    ('add_issue_comments.sql',     'table', 'issue_comments'),
    ('add_issue_status_stages.sql','table', 'issue_status_log'),
    ('add_komunalec_requests.sql', 'table', 'komunalec_requests'),
    ('add_membership_requests.sql','table', 'membership_requests'),
    ('add_notifications.sql',      'table', 'notifications'),
    ('add_push_broadcasts.sql',    'table', 'push_broadcasts'),
    ('add_push_subscriptions.sql', 'table', 'push_subscriptions'),
    ('add_social_posts.sql',       'table', 'social_posts'),

    -- ── Functions ───────────────────────────────────────────────────────────
    ('add_admin_moderation.sql',            'function', 'is_admin'),
    ('add_agencies.sql',                    'function', 'agency_for_category'),
    ('add_agencies.sql',                    'function', 'current_user_agency'),
    ('add_agencies.sql',                    'function', 'user_handles_category'),
    ('add_agency_issue_notifications.sql',  'function', 'notify_agency_on_new_issue'),
    ('add_agency_post_edit.sql',            'function', 'can_manage_agency_post'),
    ('add_agency_post_edit.sql',            'function', 'update_agency_post'),
    ('add_agency_post_edit.sql',            'function', 'delete_agency_post'),
    ('add_agency_posts.sql',                'function', 'create_agency_post'),
    ('add_help_offers.sql',                 'function', 'enforce_first_helper_date'),
    ('add_idea_upvotes.sql',                'function', 'toggle_idea_upvote'),
    ('add_initiatives.sql',                 'function', 'toggle_initiative_vote'),
    ('add_issue_status_stages.sql',         'function', 'agency_set_issue_status'),
    ('add_local_issue_notifications.sql',   'function', 'notify_on_new_issue'),
    ('add_membership_expiry.sql',           'function', 'expire_monthly_memberships'),
    ('add_notifications.sql',               'function', 'insert_issue_notification'),
    ('add_notifications.sql',               'function', 'make_issue_path'),
    ('add_notifications.sql',               'function', 'notify_on_issue_comment'),
    ('add_notifications.sql',               'function', 'notify_on_issue_affected'),
    ('add_notifications.sql',               'function', 'notify_on_issue_helper'),
    ('add_notifications.sql',               'function', 'notify_on_help_offer_comment'),
    ('add_notifications.sql',               'function', 'notify_on_help_date_vote'),
    ('schema.sql',                          'function', 'handle_new_user'),

    -- Reporting is deliberately paused. This function being present is the
    -- CURRENT intended state — running restore_issue_reporting.sql removes it.
    ('pause_issue_reporting.sql',           'function', 'block_issue_reporting')
),

-- Name checks: does the object exist at all?
by_name as (
  select
    e.source_file,
    e.name as object,
    case
      when e.kind = 'table' and exists (
        select 1 from information_schema.tables t
        where t.table_schema = 'public' and t.table_name = e.name
      ) then 'OK'
      when e.kind = 'function' and exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = e.name
      ) then 'OK'
      else 'MISSING'
    end as status
  from expected e
),

-- Checks a name alone can't answer: the object exists, but is it the right
-- version, and do the dashboard-created pieces exist at all?
by_behaviour as (
  -- update_help_offer_limit.sql raises the proposed-date cap from 1 to 3. The
  -- mobile helper sheet displays "/3", so this must come back APPLIED.
  select
    'update_help_offer_limit.sql' as source_file,
    'enforce_first_helper_date (body)' as object,
    coalesce(
      (select case
         when p.prosrc like '%' || chr(1052) || chr(1072) || chr(1082) || '%' then 'OK — cap is 3'
         when p.prosrc like '%first helper%' then 'MISSING — cap is still 1, mobile sheet shows /3 and is wrong'
         else 'UNKNOWN — read the function body'
       end
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'enforce_first_helper_date'
       limit 1),
      'MISSING — enforce_first_helper_date does not exist'
    ) as status

  union all

  -- The push webhook: notifications INSERT → /api/push/notify. Created through
  -- the dashboard, so it appears in no file and in no table listing.
  select
    '(dashboard)',
    'push_notify webhook trigger',
    case when count(*) > 0 then 'OK'
         else 'MISSING — no trigger on public.notifications' end
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'notifications' and not t.tgisinternal

  union all

  -- Without pg_net the webhook above cannot fire, however correct it looks.
  select
    '(dashboard)',
    'pg_net extension',
    case when count(*) > 0 then 'OK' else 'MISSING — webhooks cannot fire' end
  from pg_extension where extname = 'pg_net'
)

select * from (
  select source_file, object, status from by_name
  union all
  select source_file, object, status from by_behaviour
) r
-- MISSING sorts before OK, so anything wrong is at the top of the result.
order by (status like 'OK%') asc, source_file, object;
