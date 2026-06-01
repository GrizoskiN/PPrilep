-- Set годишна членарина for ngrizo@gmail.com
-- Run once in the Supabase SQL editor.

update public.profiles p
   set membership_tier = 'yearly'
  from auth.users u
 where u.id = p.id
   and u.email = 'ngrizo@gmail.com';
