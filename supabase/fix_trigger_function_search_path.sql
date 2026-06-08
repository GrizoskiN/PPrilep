-- Fix "type \"initiative_stage\" does not exist" (and similar) when deleting a user.
--
-- Root cause: deleting an auth user runs as the `supabase_auth_admin` role,
-- whose search_path does NOT include `public`. Trigger functions on public
-- tables that reference public types/tables WITHOUT schema-qualifying them
-- (e.g. sync_initiative_votes declares `v_stage initiative_stage;`) then fail
-- with "type ... does not exist", aborting the cascade delete.
--
-- Fix: pin search_path = public on every trigger function attached to a public
-- table, so unqualified references resolve regardless of the calling role.
-- Safe and idempotent. Run once in the Supabase SQL editor.

do $$
declare r record;
begin
  for r in
    select distinct p.oid::regprocedure as fn
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    where not t.tgisinternal
      and t.tgrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace)
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.fn);
  end loop;
end $$;
