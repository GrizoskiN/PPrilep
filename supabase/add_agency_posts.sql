-- ════════════════════════════════════════════════════════════════════════════
--  Phase 5 — Agency posts / alerts (in-app only, no email)
--
--  An institution operator publishes a post targeted at:
--    • specific street(s)  → notify residents whose street matches
--    • a whole district    → notify residents in that district
--    • everyone (red alert)→ notify every user, highlighted red
--  Posts show on the agency's page and in the home feed.
--
--  Run ONCE in the Supabase SQL editor (after add_agencies.sql + notifications).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.agency_posts (
  id              bigserial primary key,
  agency_id       text   not null references public.agencies(id) on delete cascade,
  author_user_id  uuid   references public.profiles(id) on delete set null,
  title           text   not null,
  body            text,
  audience        text   not null check (audience in ('street','district','all')),
  target_district text,
  target_streets  text[],
  is_red_alert    boolean not null default false,
  created_at      timestamptz not null default now(),
  constraint agency_posts_title_not_blank check (length(trim(title)) > 0)
);

create index if not exists agency_posts_created_idx on public.agency_posts(created_at desc);
create index if not exists agency_posts_agency_idx  on public.agency_posts(agency_id, created_at desc);

alter table public.agency_posts enable row level security;
drop policy if exists "Public read agency posts" on public.agency_posts;
create policy "Public read agency posts" on public.agency_posts for select using (true);

-- ── RPC: publish a post (operator/admin only) + fan out notifications ─────────
create or replace function public.create_agency_post(
  p_title           text,
  p_body            text,
  p_audience        text,
  p_target_district text default null,
  p_target_streets  text[] default null,
  p_is_red_alert    boolean default false
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
begin
  v_agency := public.current_user_agency();
  if v_agency is null and not public.is_admin() then
    raise exception 'Not an institution account';
  end if;
  if v_agency is null then
    -- admin posting: require an explicit agency via the caller is not supported;
    -- admins post as municipality by default.
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

  -- Fan out in-app notifications to the targeted residents (never the author).
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
grant execute on function public.create_agency_post(text, text, text, text, text[], boolean) to authenticated;
