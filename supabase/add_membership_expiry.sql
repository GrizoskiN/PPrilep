-- Monthly membership expiry.
-- A monthly member is granted for one month; when the month elapses they are
-- automatically downgraded back to 'volunteer'. The app stamps
-- membership_expires_at when the tier is set (see app/actions/membership.ts);
-- this migration adds the column and a daily job that performs the downgrade.
-- Run once in the Supabase SQL editor.

alter table public.profiles
  add column if not exists membership_expires_at timestamptz;

-- The downgrade itself. Safe to run repeatedly / by hand.
create or replace function public.expire_monthly_memberships()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.profiles
     set membership_tier = 'volunteer',
         membership_expires_at = null
   where membership_tier = 'monthly'
     and membership_expires_at is not null
     and membership_expires_at < now();
$$;

-- Schedule it once a day via pg_cron.
-- Requires the pg_cron extension: Supabase Dashboard → Database → Extensions →
-- enable "pg_cron". If it is not enabled the block below is a no-op and you can
-- instead run `select public.expire_monthly_memberships();` on any schedule.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('expire-monthly-memberships')
      where exists (
        select 1 from cron.job where jobname = 'expire-monthly-memberships'
      );
    perform cron.schedule(
      'expire-monthly-memberships',
      '0 3 * * *',                     -- every day at 03:00
      $cron$ select public.expire_monthly_memberships(); $cron$
    );
  end if;
end;
$$;
