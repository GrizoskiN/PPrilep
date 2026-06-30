-- ════════════════════════════════════════════════════════════════════════════
--  Let authenticated users persist their own onboarding-tour completion.
--  Run ONCE in the Supabase SQL editor.
--
--  WHY:
--  harden_profiles_rls.sql revoked blanket UPDATE on public.profiles and handed
--  back only a safe column subset (username, full_name, avatar_url, street_name,
--  district, email_digest, email_newsletter). The `onboarded` flag was added
--  later (add_onboarded_flag.sql) and never included in that grant — so the
--  onboarding tour's `update({ onboarded: true })` is rejected at the column
--  level and the flag never sticks. Result: the tour relies on localStorage
--  alone and reappears on every new device / after clearing site data.
--
--  `onboarded` is non-privileged (a per-user UI flag), so it is safe to let each
--  user write it on their own row. The existing "Own profile" UPDATE policy
--  (using auth.uid() = id, with check auth.uid() = id) already restricts WHICH
--  row they may touch.
-- ════════════════════════════════════════════════════════════════════════════

grant update (onboarded) on public.profiles to authenticated;

-- Refresh PostgREST's schema cache so the new privilege takes effect immediately.
notify pgrst, 'reload schema';
