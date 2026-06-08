-- Persist whether a user has completed (or skipped) the onboarding tour, so it
-- never re-appears — even on a new device or after clearing localStorage.
-- Run once in the Supabase SQL editor.

alter table public.profiles
  add column if not exists onboarded boolean not null default false;
