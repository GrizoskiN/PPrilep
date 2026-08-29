-- Admin membership RPCs — let an admin manage memberships directly from a client
-- (the mobile app) without the service-role key. `membership_tier` is a privileged
-- column that RLS locks to the service role (see harden_profiles_rls.sql), so the
-- client CANNOT update it directly; these SECURITY DEFINER functions are the
-- sanctioned path — they self-check is_admin() and then write on the caller's
-- behalf. The web app takes a different route (a Next server action using the
-- service-role client, app/actions/membership.ts), which is why tier changes work
-- on the web but the mobile app — which calls these RPCs — fails with
-- "Could not find the function ... in the schema cache" until this is applied.
--
-- Run ONCE in the Supabase SQL editor. Idempotent (CREATE OR REPLACE + re-grants).

-- 1. Set a user's membership tier (null clears it). `monthly` also sets a
--    one-month expiry; every other tier clears the expiry.
CREATE OR REPLACE FUNCTION public.admin_set_membership_tier(p_user_id uuid, p_tier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_tier = 'monthly' THEN
    UPDATE public.profiles
       SET membership_tier = p_tier,
           membership_expires_at = now() + interval '1 month'
     WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
       SET membership_tier = p_tier,
           membership_expires_at = null
     WHERE id = p_user_id;
  END IF;
END;
$$;

-- 2. Approve a pending membership request → stamps the request and applies its tier.
CREATE OR REPLACE FUNCTION public.admin_approve_membership(p_request_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_tier    text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.membership_requests
     SET status = 'approved'
   WHERE id = p_request_id
   RETURNING user_id, tier INTO v_user_id, v_tier;

  IF v_user_id IS NOT NULL THEN
    PERFORM public.admin_set_membership_tier(v_user_id, v_tier);
  END IF;
END;
$$;

-- 3. Reject a pending membership request.
CREATE OR REPLACE FUNCTION public.admin_reject_membership(p_request_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.membership_requests SET status = 'rejected' WHERE id = p_request_id;
END;
$$;

-- Callable by logged-in users; each function gates on is_admin() internally.
GRANT EXECUTE ON FUNCTION public.admin_set_membership_tier(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_membership(bigint)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_membership(bigint)        TO authenticated;

-- Make PostgREST pick the new functions up immediately (otherwise the mobile app
-- keeps getting "Could not find the function ... in the schema cache" until the
-- next automatic reload).
NOTIFY pgrst, 'reload schema';
