-- Pre-seed the "club approved" push claims for clubs that were ALREADY published
-- before broadcastClubApproved (lib/push/clubApproved.ts) went live.
--
-- Why: that broadcaster claims each club once, on its first publish after deploy,
-- and only then congratulates the submitter. For a club that is already live,
-- "first publish after deploy" would be its next edit — so without this seed, the
-- next time an existing owner edits their approved club they'd get a one-time,
-- wrong "одобрен ✅" push. Inserting the claim now marks them as already handled.
--
-- Matches the namespaced key the code uses: `clubApproved:<sanity _id>`.
-- Idempotent: ON CONFLICT DO NOTHING, so re-running is a no-op. New clubs are not
-- listed here on purpose — they SHOULD fire on approval.
--
-- Run in the Supabase SQL editor.

insert into public.push_broadcasts (event_id) values
  ('clubApproved:03d49c63-b536-402a-9075-b0fca3df8d02'),
  ('clubApproved:91d4fd0a-c421-4c45-9bda-7ac9c183d4b6')
on conflict (event_id) do nothing;
