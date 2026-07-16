-- Add RPC functions to allow admins to manage memberships directly from clients 
-- (e.g. mobile app) without needing the service role key.

-- 1. Function to set membership tier
CREATE OR REPLACE FUNCTION admin_set_membership_tier(p_user_id UUID, p_tier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  
  IF p_tier = 'monthly' THEN
    UPDATE public.profiles SET membership_tier = p_tier, membership_expires_at = NOW() + interval '1 month' WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles SET membership_tier = p_tier, membership_expires_at = null WHERE id = p_user_id;
  END IF;
END;
$$;

-- 2. Function to approve membership request
CREATE OR REPLACE FUNCTION admin_approve_membership(p_request_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_tier text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.membership_requests SET status = 'approved' WHERE id = p_request_id RETURNING user_id, tier INTO v_user_id, v_tier;
  
  IF v_user_id IS NOT NULL THEN
    PERFORM admin_set_membership_tier(v_user_id, v_tier);
  END IF;
END;
$$;

-- 3. Function to reject membership request
CREATE OR REPLACE FUNCTION admin_reject_membership(p_request_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.membership_requests SET status = 'rejected' WHERE id = p_request_id;
END;
$$;
