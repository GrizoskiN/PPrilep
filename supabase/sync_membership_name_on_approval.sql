-- ════════════════════════════════════════════════════════════════════════════
--  Copy the application's business name onto the profile when a membership is
--  approved.
--
--  Why: a business applies with its company name in the partner form
--  (membership_requests.full_name, e.g. "Автобуска станица Прилеп — ПЕЛАГОНУЈА
--  БУС ДООЕЛ"), but the account itself was registered under a person's name
--  (profiles.full_name, e.g. "Борче Чупетрески"). Approval only flipped the
--  tier, so the partner card kept showing the person, not the business.
--
--  Now approval also writes the application name onto the profile, so every
--  future approval shows the company on the card. Existing (already-approved)
--  partners are NOT touched by this — fix those by hand, or re-run approval.
--
--  This replaces the admin_approve_membership from add_manual_partners.sql;
--  everything else in that function is preserved.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.admin_approve_membership(p_request_id bigint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id   uuid;
  v_tier      text;
  v_full_name text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select user_id, tier, full_name
    into v_user_id, v_tier, v_full_name
  from public.membership_requests
  where id = p_request_id;

  if not found then
    raise exception 'No membership request %', p_request_id;
  end if;

  if v_user_id is null then
    raise exception
      'Request % has no account attached, so no tier can be granted. Ask them to sign up and link the request, or add them as a manual partner instead.',
      p_request_id;
  end if;

  update public.membership_requests set status = 'approved' where id = p_request_id;
  perform public.admin_set_membership_tier(v_user_id, v_tier);

  -- Show the business, not the applicant: overwrite the profile name with the
  -- name from the application (only when the application actually carried one).
  if v_full_name is not null and btrim(v_full_name) <> '' then
    update public.profiles
      set full_name = btrim(v_full_name)
    where id = v_user_id;
  end if;
end;
$$;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
