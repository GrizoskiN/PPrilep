-- Free-text "who solved it" for issues.
--
-- Until now `issues.resolved_by` was a uuid FK to profiles, so the resolver had
-- to be a registered user (the author or a helper). Many issues are fixed by an
-- institution ("Комуналец", "Водовод") or a person who isn't on the platform,
-- and admins need to credit them by name. `resolved_by_label` holds that name.
--
-- Display rule (client-side, web + mobile): when the issue is resolved, show
-- `resolved_by_label` if set, otherwise fall back to the `resolved_by` profile.
-- The two are independent columns; a label does not require a FK and vice versa.
--
-- Who can set it: admins only. The column is added with no new RLS — the
-- existing issues UPDATE policy already governs the row, and the clients gate
-- the input to admins. (If author-proof enforcement is ever needed, add a
-- column-scoped policy; today the UI is the gate, matching how the resolver
-- dropdown was already admin-gated on the web.)

alter table public.issues
  add column if not exists resolved_by_label text;

comment on column public.issues.resolved_by_label is
  'Free-text name of who solved the issue (e.g. an institution or a non-registered person). Takes display precedence over resolved_by when set. Admin-set only.';
