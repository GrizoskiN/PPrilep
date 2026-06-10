-- ════════════════════════════════════════════════════════════════════════════
--  Phase 5b — Edit / delete an agency post
--
--  The owning institution operator (its agency_id matches the post) or an admin
--  may edit the post's text or remove it entirely. Role-checked SECURITY DEFINER
--  RPCs, same pattern as create_agency_post.
--
--  Run ONCE in the Supabase SQL editor (after add_agency_posts.sql).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Can the caller manage this post? (admin, or its agency operator) ──────────
create or replace function public.can_manage_agency_post(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_post_agency text;
begin
  select agency_id into v_post_agency from public.agency_posts where id = p_id;
  if v_post_agency is null then
    return false;
  end if;
  return public.is_admin() or public.current_user_agency() = v_post_agency;
end;
$$;
grant execute on function public.can_manage_agency_post(bigint) to authenticated;

-- ── RPC: edit a post's text (title / body) ───────────────────────────────────
create or replace function public.update_agency_post(
  p_id    bigint,
  p_title text,
  p_body  text default null
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

  update public.agency_posts
     set title = p_title,
         body  = nullif(trim(coalesce(p_body,'')), '')
   where id = p_id;
end;
$$;
grant execute on function public.update_agency_post(bigint, text, text) to authenticated;

-- ── RPC: delete a post ───────────────────────────────────────────────────────
create or replace function public.delete_agency_post(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.can_manage_agency_post(p_id) then
    raise exception 'Not authorised to delete this post';
  end if;
  delete from public.agency_posts where id = p_id;
end;
$$;
grant execute on function public.delete_agency_post(bigint) to authenticated;
