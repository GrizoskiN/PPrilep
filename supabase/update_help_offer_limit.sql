-- Allow up to 3 helpers to propose dates (previously only the first helper could)

create or replace function public.enforce_first_helper_date()
returns trigger
language plpgsql
as $$
declare
  date_offer_count int;
begin
  -- No date set — always allow
  if new.service_date is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select count(*)
    into date_offer_count
    from public.issue_help_offers
    where issue_id = new.issue_id
      and service_date is not null;

    if date_offer_count >= 3 then
      raise exception 'Максималниот број на предлог датуми е достигнат.';
    end if;

  elsif tg_op = 'UPDATE' then
    -- Don't count this row itself
    select count(*)
    into date_offer_count
    from public.issue_help_offers
    where issue_id = new.issue_id
      and service_date is not null
      and id <> new.id;

    if date_offer_count >= 3 then
      raise exception 'Максималниот број на предлог датуми е достигнат.';
    end if;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
