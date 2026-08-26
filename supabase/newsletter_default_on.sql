-- ════════════════════════════════════════════════════════════════════════════
--  Notification defaults: the daily newsletter becomes opt-OUT
-- ════════════════════════════════════════════════════════════════════════════
--  `email_newsletter` was created opt-in (`default false`) in
--  harden_profiles_rls.sql. New accounts now get it on by default, matching
--  `email_digest` and `notif_local_issues`, both of which have always defaulted
--  to true.
--
--  Run this once in the Supabase SQL editor.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  alter column email_newsletter set default true;

-- ── EXISTING USERS ARE DELIBERATELY NOT TOUCHED ──────────────────────────────
--  The column is `not null`, so every existing row already holds `false` — and
--  there is no way to tell "never chose" apart from "explicitly turned it off".
--  Flipping them all on would silently re-subscribe people who opted out.
--
--  If you decide to switch existing users on anyway, that is a consent call to
--  make deliberately, not a side effect of this migration. The statement is:
--
--    update public.profiles set email_newsletter = true;
--
--  Either way, every email must keep a working unsubscribe link.
