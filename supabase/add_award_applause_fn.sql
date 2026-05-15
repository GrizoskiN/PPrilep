-- Atomic helper: increments a profile's points by exactly 1
-- SECURITY DEFINER so it runs as the function owner, bypassing RLS.
CREATE OR REPLACE FUNCTION award_applause(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles SET points = points + 1 WHERE id = p_user_id;
$$;
