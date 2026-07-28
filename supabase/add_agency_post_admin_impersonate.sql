-- ════════════════════════════════════════════════════════════════════════════
--  Let admins publish an agency_post AS a chosen agency, without logging in
--  as that operator. Operators are unaffected — their agency is still forced
--  to their own `profiles.agency_id`.
--
--  Run ONCE in the Supabase SQL editor (after add_agency_posts.sql).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.create_agency_post(
  p_title           text,
  p_body            text,
  p_audience        text,
  p_target_district text default null,
  p_target_streets  text[] default null,
  p_is_red_alert    boolean default false,
  p_as_agency       text    default null
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

  -- Admin can post as any real agency; operators are pinned to their own.
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

  insert into public.agency_posts
    (agency_id, author_user_id, title, body, audience, target_district,
     target_streets, is_red_alert)
  values
    (v_agency, auth.uid(), p_title, nullif(trim(coalesce(p_body,'')),''),
     p_audience, p_target_district, p_target_streets,
     coalesce(p_is_red_alert,false))
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

grant execute on function public.create_agency_post(text, text, text, text, text[], boolean, text) to authenticated;
