-- ════════════════════════════════════════════════════════════════════════════
--  Let an ADMIN re-attribute an announcement to a different institution
--  (e.g. a post published as "Општина" that should have come from "Водовод").
--
--  Adds an optional p_agency_id to update_agency_post. Reassignment is
--  ADMIN-ONLY: an ordinary institution operator can still edit their own post's
--  text/schedule, but may NOT hand it to another agency (that would let them
--  impersonate a service and lose their own manage rights). When p_agency_id is
--  null the agency is left unchanged, so existing callers keep working.
--
--  Run ONCE in the Supabase SQL editor (after add_agency_post_edit.sql +
--  add_agency_post_schedule.sql).
-- ════════════════════════════════════════════════════════════════════════════

-- Drop the previous 5-arg version so the optional-6th-arg overload can't be
-- ambiguous to PostgREST when called with the old parameter set.
drop function if exists public.update_agency_post(bigint, text, text, timestamptz, timestamptz);

create or replace function public.update_agency_post(
  p_id        bigint,
  p_title     text,
  p_body      text        default null,
  p_starts_at timestamptz default null,
  p_ends_at   timestamptz default null,
  p_agency_id text        default null
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

  -- Only an admin may change which institution the post is attributed to.
  if p_agency_id is not null then
    if not public.is_admin() then
      raise exception 'Only an admin can change the sending institution';
    end if;
    if not exists (select 1 from public.agencies where id = p_agency_id) then
      raise exception 'Unknown agency %', p_agency_id;
    end if;
  end if;

  update public.agency_posts
     set title     = p_title,
         body      = nullif(trim(coalesce(p_body,'')), ''),
         starts_at = p_starts_at,
         ends_at   = p_ends_at,
         agency_id = coalesce(p_agency_id, agency_id)
   where id = p_id;
end;
$$;
grant execute on function public.update_agency_post(bigint, text, text, timestamptz, timestamptz, text) to authenticated;
