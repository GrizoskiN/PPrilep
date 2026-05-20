-- Notifications for issue interactions and idea upvotes.

create table if not exists public.notifications (
  id bigserial primary key,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('issue_comment','issue_affected','issue_helper','issue_help_comment','issue_help_vote','idea_upvote','comment_like','comment_reply')),
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

-- Mirrors transliterateToLatin() + slugify() + getIssuePath() from lib/utils.ts
-- so notification links are identical to what the JS generates.
create or replace function public.make_issue_path(issue_id bigint, issue_title text)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  result text;
begin
  result := lower(issue_title);

  -- Multi-char Macedonian digraphs first (order matters)
  result := replace(result, 'ѓ', 'gj');
  result := replace(result, 'ѕ', 'dz');
  result := replace(result, 'љ', 'lj');
  result := replace(result, 'њ', 'nj');
  result := replace(result, 'ќ', 'kj');
  result := replace(result, 'џ', 'dj');
  result := replace(result, 'ж', 'zh');
  result := replace(result, 'ч', 'ch');
  result := replace(result, 'ш', 'sh');

  -- Single-char Macedonian Cyrillic
  result := replace(result, 'а', 'a');
  result := replace(result, 'б', 'b');
  result := replace(result, 'в', 'v');
  result := replace(result, 'г', 'g');
  result := replace(result, 'д', 'd');
  result := replace(result, 'е', 'e');
  result := replace(result, 'з', 'z');
  result := replace(result, 'и', 'i');
  result := replace(result, 'ј', 'j');
  result := replace(result, 'к', 'k');
  result := replace(result, 'л', 'l');
  result := replace(result, 'м', 'm');
  result := replace(result, 'н', 'n');
  result := replace(result, 'о', 'o');
  result := replace(result, 'п', 'p');
  result := replace(result, 'р', 'r');
  result := replace(result, 'с', 's');
  result := replace(result, 'т', 't');
  result := replace(result, 'у', 'u');
  result := replace(result, 'ф', 'f');
  result := replace(result, 'х', 'h');
  result := replace(result, 'ц', 'c');

  -- Slugify: remove non-alphanumeric, collapse dashes, trim
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  result := regexp_replace(result, '^-+|-+$', '', 'g');
  result := regexp_replace(result, '-{2,}', '-', 'g');

  if result = '' then result := 'issue'; end if;

  return '/issues/' || result || '-' || issue_id::text;
end;
$$;

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
    public.make_issue_path(target_issue.id, target_issue.title)
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
