-- ════════════════════════════════════════════════════════════════════════════
--  Manually-curated business partners + a fix for silent membership approval.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Fix: approving a request with no account was a silent no-op ──────────
--
--  A business that filled in the partner form without signing in produced a
--  request with user_id = null. Approval flipped the status to 'approved',
--  skipped the tier update, and raised nothing — so the dashboard said approved
--  while the partner never appeared anywhere. The failure was invisible.
--
--  Now it refuses, and says what to do instead. The UPDATE is inside the same
--  transaction as the RAISE, so the status is not left flipped.
create or replace function public.admin_approve_membership(p_request_id bigint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_tier    text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select user_id, tier into v_user_id, v_tier
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
end;
$$;

-- ── 2. Manually-entered partners ────────────────────────────────────────────
--
--  For local businesses that never apply and never sign up. They are content,
--  not users: `profiles` cannot hold them because profiles.id is FK'd to
--  auth.users, and minting an auth account for a shop that will never log in
--  would be a login nobody wants and a password nobody sets.
create table if not exists public.partners (
  id          bigserial primary key,
  name        text not null,
  tier        text not null default 'company_basic'
                check (tier in ('company_basic','company_preferred','company_premium')),
  logo_url    text,
  website     text,
  phone       text,
  note        text,
  -- Hide without deleting: sponsorships lapse and come back.
  is_active   boolean not null default true,
  -- Manual ordering within a tier; lower first. Profile-based partners sort by
  -- points, which a manual partner has no way to earn.
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists partners_active_idx on public.partners(is_active, tier, sort);

alter table public.partners enable row level security;

-- Public sees active partners only; admins see and change everything.
drop policy if exists "Public active partners" on public.partners;
create policy "Public active partners" on public.partners
  for select using (is_active or public.is_admin());

drop policy if exists "Admins manage partners" on public.partners;
create policy "Admins manage partners" on public.partners
  for all using (public.is_admin()) with check (public.is_admin());

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
