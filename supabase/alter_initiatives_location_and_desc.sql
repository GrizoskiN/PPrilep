-- Initiatives: relax description minimum (50 → 20) and add precise location.
-- Run once in the Supabase SQL editor.

-- ── 1) Description minimum 50 → 20 ───────────────────────────────────────────
alter table public.initiatives
  drop constraint if exists initiatives_description_check;

alter table public.initiatives
  add constraint initiatives_description_check
  check (char_length(description) between 20 and 2000);

-- ── 2) Precise location (matches the "Пријави проблем" pin) ───────────────────
alter table public.initiatives
  add column if not exists lat double precision;

alter table public.initiatives
  add column if not exists lng double precision;

-- Reload PostgREST's schema cache so the new columns are usable immediately
-- (otherwise inserts fail with "Could not find the 'lat' column ... in the
-- schema cache" until the next auto-reload).
notify pgrst, 'reload schema';
