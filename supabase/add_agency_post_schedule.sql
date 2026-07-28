-- ════════════════════════════════════════════════════════════════════════════
--  Give agency_posts an optional active window (starts_at / ends_at) so
--  time-boxed announcements (planned outage 11:00–14:45, etc.) disappear
--  automatically instead of needing manual cleanup.
--
--  Both columns are nullable — posts without a window behave exactly as before
--  (visible from creation until the operator deletes them).
--
--  Run ONCE in the Supabase SQL editor (after add_agency_posts.sql +
--  add_agency_post_edit.sql + add_agency_post_admin_impersonate.sql).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.agency_posts
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at   timestamptz;

-- Index the end so the "hide expired" filter is cheap.
create index if not exists agency_posts_ends_at_idx
  on public.agency_posts(ends_at) where ends_at is not null;

-- ── Recreate create_agency_post with the schedule fields ─────────────────────
create or replace function public.create_agency_post(
  p_title           text,
  p_body            text,
  p_audience        text,
  p_target_district text default null,
  p_target_streets  text[] default null,
  p_is_red_alert    boolean default false,
  p_as_agency       text    default null,
  p_starts_at       timestamptz default null,
  p_ends_at         timestamptz default null
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_agency text;
  v_post_id bigint;
  v_link text;
  v_is_admin boolean := public.is_admin();
begin
  v_agency := public.current_user_agency();
  if v_agency is null and not v_is_admin then
    raise exception 'Not an institution account';
  end if;

  if v_is_admin and p_as_agency is not null then
    if not exists (select 1 from public.agencies where id = p_as_agency) then
      raise exception 'Unknown agency %', p_as_agency;
    end if;
    v_agency := p_as_agency;
  elsif v_agency is null then
    v_agency := 'municipality';
  end if;

  if p_audience not in ('street','district','all') then
    raise exception 'Invalid audience %', p_audience;
  end if;

  if p_ends_at is not null and p_starts_at is not null and p_ends_at <= p_starts_at then
    raise exception 'ends_at must be after starts_at';
  end if;

  insert into public.agency_posts
    (agency_id, author_user_id, title, body, audience, target_district,
     target_streets, is_red_alert, starts_at, ends_at)
  values
    (v_agency, auth.uid(), p_title, nullif(trim(coalesce(p_body,'')),''),
     p_audience, p_target_district, p_target_streets,
     coalesce(p_is_red_alert,false), p_starts_at, p_ends_at)
  returning id into v_post_id;

  v_link := '/agency/' || v_agency;

  insert into public.notifications
    (recipient_user_id, actor_user_id, type, title, body, link)
  select p.id,
         auth.uid(),
         case when coalesce(p_is_red_alert,false) or p_audience = 'all'
              then 'agency_alert' else 'agency_post' end,
         p_title,
         coalesce(nullif(trim(coalesce(p_body,'')),''), 'Ново соопштение'),
         v_link
  from public.profiles p
  where p.id <> auth.uid()
    and (
      p_audience = 'all'
      or (p_audience = 'district' and p.district = p_target_district)
      or (p_audience = 'street'
          and p_target_streets is not null
          and p.street_name = any(p_target_streets))
    );

  return v_post_id;
end;
$$;
grant execute on function public.create_agency_post(text, text, text, text, text[], boolean, text, timestamptz, timestamptz) to authenticated;

-- ── Extend update_agency_post so operators can adjust the window too ─────────
create or replace function public.update_agency_post(
  p_id        bigint,
  p_title     text,
  p_body      text        default null,
  p_starts_at timestamptz default null,
  p_ends_at   timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.can_manage_agency_post(p_id) then
    raise exception 'Not authorised to edit this post';
  end if;
  if length(trim(coalesce(p_title,''))) = 0 then
    raise exception 'Title required';
  end if;
  if p_ends_at is not null and p_starts_at is not null and p_ends_at <= p_starts_at then
    raise exception 'ends_at must be after starts_at';
  end if;

  update public.agency_posts
     set title     = p_title,
         body      = nullif(trim(coalesce(p_body,'')), ''),
         starts_at = p_starts_at,
         ends_at   = p_ends_at
   where id = p_id;
end;
$$;
grant execute on function public.update_agency_post(bigint, text, text, timestamptz, timestamptz) to authenticated;
