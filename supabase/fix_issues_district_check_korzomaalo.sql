-- The `issues.district` CHECK constraint predates the "Корзо Маало"
-- (KorzoMaalo) district and never got it, so editing an issue to that Naselba
-- fails with: new row for relation "issues" violates check constraint
-- "issues_district_check". Every other table (ideas, initiatives) and the app's
-- District type already include KorzoMaalo — this brings issues in line.
--
-- Run once in the Supabase SQL editor.

alter table public.issues drop constraint if exists issues_district_check;

alter table public.issues add constraint issues_district_check
  check (district in (
    'Center','Varoš','Trizla','Točila','Rid','Tipski','Boncejca','KorzoMaalo'
  ));
