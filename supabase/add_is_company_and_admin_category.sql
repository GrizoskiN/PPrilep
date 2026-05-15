-- Add is_company flag to profiles (for Heroes: People vs Companies split)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_company boolean DEFAULT false;

-- Extend issues.category check to include 'admin' and other categories added post-launch
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_category_check;
ALTER TABLE issues ADD CONSTRAINT issues_category_check
  CHECK (category IN ('road','water','power','garbage','park','negligent','transport','parking','admin','other'));
