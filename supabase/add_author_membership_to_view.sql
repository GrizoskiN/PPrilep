-- Add author_membership_tier and author_points to the initiatives_with_details view.
-- Run once in the Supabase SQL editor.
-- Must drop first because create or replace cannot reorder/rename existing columns.

drop view if exists public.initiatives_with_details;
create view public.initiatives_with_details as
select
  i.*,
  p.username                                 as author_username,
  p.full_name                                as author_full_name,
  p.avatar_url                               as author_avatar,
  p.membership_tier                          as author_membership_tier,
  p.points                                   as author_points,
  case
    when i.vote_threshold > 0
      then least(100, round((i.vote_count::numeric / i.vote_threshold) * 100))::int
    else 0
  end                                         as vote_progress_pct,
  case
    when i.target_amount is not null and i.target_amount > 0
      then least(100, round((i.raised_amount / i.target_amount) * 100))::int
    else 0
  end                                         as fund_progress_pct,
  (select count(*)::int from public.initiative_votes v
    where v.initiative_id = i.id)            as supporter_count
from public.initiatives i
left join public.profiles p on p.id = i.user_id;
