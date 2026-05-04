-- Notifications for issue interactions and idea upvotes.

create table if not exists public.notifications (
  id bigserial primary key,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('issue_comment','issue_affected','issue_helper','issue_help_comment','issue_help_vote','idea_upvote')),
  title text not null,
  body text not null,
  link text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_user_id, created_at desc);

create index if not exists notifications_recipient_read_idx
  on public.notifications (recipient_user_id, read_at);

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

drop policy if exists "Own read notifications" on public.notifications;
create policy "Own read notifications" on public.notifications
for select using (auth.uid() = recipient_user_id);

drop policy if exists "Actor insert notifications" on public.notifications;
create policy "Actor insert notifications" on public.notifications
for insert with check (
  auth.role() = 'authenticated' and auth.uid() = actor_user_id
);

drop policy if exists "Own update notifications" on public.notifications;
create policy "Own update notifications" on public.notifications
for update using (auth.uid() = recipient_user_id);

create or replace function public.insert_issue_notification(
  target_issue_id bigint,
  notification_actor_user_id uuid,
  notification_type text,
  notification_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_issue record;
begin
  select id, title, reported_by
  into target_issue
  from public.issues
  where id = target_issue_id;

  if not found then
    return;
  end if;

  if target_issue.reported_by is null or target_issue.reported_by = notification_actor_user_id then
    return;
  end if;

  insert into public.notifications (
    recipient_user_id,
    actor_user_id,
    type,
    title,
    body,
    link
  )
  values (
    target_issue.reported_by,
    notification_actor_user_id,
    notification_type,
    target_issue.title,
    notification_body,
    '/issues/' || target_issue.id
  );
end;
$$;

create or replace function public.notify_on_issue_comment()
returns trigger
language plpgsql
as $$
begin
  perform public.insert_issue_notification(
    new.issue_id,
    new.user_id,
    'issue_comment',
    'коментираше на вашата пријава'
  );
  return new;
end;
$$;

create or replace function public.notify_on_issue_affected()
returns trigger
language plpgsql
as $$
begin
  perform public.insert_issue_notification(
    new.issue_id,
    new.user_id,
    'issue_affected',
    'се означи како засегнат/а на вашата пријава'
  );
  return new;
end;
$$;

create or replace function public.notify_on_issue_helper()
returns trigger
language plpgsql
as $$
begin
  perform public.insert_issue_notification(
    new.issue_id,
    new.user_id,
    'issue_helper',
    'понуди помош за вашата пријава'
  );
  return new;
end;
$$;

create or replace function public.notify_on_help_offer_comment()
returns trigger
language plpgsql
as $$
declare
  target_issue_id bigint;
begin
  select issue_id
  into target_issue_id
  from public.issue_help_offers
  where id = new.offer_id;

  if target_issue_id is not null then
    perform public.insert_issue_notification(
      target_issue_id,
      new.user_id,
      'issue_help_comment',
      'додаде коментар за помош на вашата пријава'
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_on_help_date_vote()
returns trigger
language plpgsql
as $$
declare
  target_issue_id bigint;
begin
  select issue_id
  into target_issue_id
  from public.issue_help_offers
  where id = new.offer_id;

  if target_issue_id is not null then
    perform public.insert_issue_notification(
      target_issue_id,
      new.user_id,
      'issue_help_vote',
      'гласаше за предложен датум на вашата пријава'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_issue_comment on public.issue_comments;
create trigger trg_notify_issue_comment
after insert on public.issue_comments
for each row execute function public.notify_on_issue_comment();

drop trigger if exists trg_notify_issue_affected on public.issue_affected;
create trigger trg_notify_issue_affected
after insert on public.issue_affected
for each row execute function public.notify_on_issue_affected();

drop trigger if exists trg_notify_issue_helper on public.issue_helpers;
create trigger trg_notify_issue_helper
after insert on public.issue_helpers
for each row execute function public.notify_on_issue_helper();

do $$
begin
  if to_regclass('public.issue_help_offer_comments') is not null then
    execute 'drop trigger if exists trg_notify_help_offer_comment on public.issue_help_offer_comments';
    execute 'create trigger trg_notify_help_offer_comment after insert on public.issue_help_offer_comments for each row execute function public.notify_on_help_offer_comment()';
  end if;

  if to_regclass('public.issue_help_date_votes') is not null then
    execute 'drop trigger if exists trg_notify_help_date_vote on public.issue_help_date_votes';
    execute 'create trigger trg_notify_help_date_vote after insert on public.issue_help_date_votes for each row execute function public.notify_on_help_date_vote()';
  end if;
end;
$$;
