-- Add kindergarten provider to utility_posts
-- and a post_type column for categorising posts

-- 1. Drop the old check constraint and recreate it with 'kindergarten' added
alter table utility_posts
  drop constraint if exists utility_posts_provider_check;

alter table utility_posts
  add constraint utility_posts_provider_check
    check (provider in ('water','garbage','power','transport','parking','kindergarten'));

-- 2. Add post_type column (menu | programme | idea | announcement)
alter table utility_posts
  add column if not exists post_type text
    check (post_type in ('menu','programme','idea','announcement'));

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
