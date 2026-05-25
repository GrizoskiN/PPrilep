-- DEV ONLY — set vote_count on initiatives for visual testing.
-- Skips the join table (no real voter rows), just writes the cached count
-- and stage directly. Re-run as often as you want.

-- Option A: bump every existing initiative to 30 votes (voting stage)
update public.initiatives
   set vote_count = 30,
       stage      = 'voting'
 where stage in ('idea','voting');

-- Option B: target one specific initiative — uncomment & edit
-- update public.initiatives
--    set vote_count = 30,
--        stage      = 'voting'
--  where id = '00000000-0000-0000-0000-000000000000';

-- Option C: try the funding threshold (100)
-- update public.initiatives
--    set vote_count = 100,
--        stage      = 'funding'
--  where id = '00000000-0000-0000-0000-000000000000';
