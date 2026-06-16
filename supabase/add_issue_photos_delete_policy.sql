-- ════════════════════════════════════════════════════════════════════════════
--  Allow deleting files from the `issue-photos` bucket.
--
--  Until now this bucket had only SELECT (public read) and INSERT (auth upload)
--  policies — no DELETE — so RLS silently blocked every attempt to remove a
--  file. That meant deleting a post left its before/after photos (and its
--  comment images) orphaned in storage forever, slowly filling the quota.
--
--  This adds a DELETE policy so:
--    • a user can remove files they uploaded (owner = auth.uid()) — e.g. the
--      before/after photos on their own post, and their own comment images;
--    • an admin/moderator can remove ANY file in the bucket (is_admin()) — so
--      moderating/deleting someone else's post also clears its comment images.
--
--  Pairs with the client-side cleanup in components/issues/IssueDetail.tsx
--  (cleanupIssuePhotos), which lists comments/<issueId>/ and removes the post's
--  photos when the issue row is deleted.
--
--  Run ONCE in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "Own or admin delete photos" on storage.objects;
create policy "Own or admin delete photos" on storage.objects
  for delete using (
    bucket_id = 'issue-photos'
    and (owner = auth.uid() or public.is_admin())
  );
