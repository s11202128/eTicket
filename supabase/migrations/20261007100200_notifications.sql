-- Notifications. user_id = null is a broadcast to every user.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text check (body is null or char_length(body) <= 1000),
  -- Internal links only, e.g. /tickets/ABC123.
  link text check (link is null or link ~ '^/[^/]'),
  -- Read state for personal notifications; broadcasts use notification_reads.
  read_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_broadcast_created_idx
  on public.notifications (created_at desc) where user_id is null;

-- Per-user read receipts for broadcasts (one broadcast row is shared by all).
create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default timezone('utc', now()),
  primary key (notification_id, user_id)
);

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

create policy "Users read own and broadcast notifications"
  on public.notifications
  for select
  to authenticated
  using (user_id = (select auth.uid()) or user_id is null or (select public.is_admin()));

create policy "Admins send notifications"
  on public.notifications
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins delete notifications"
  on public.notifications
  for delete
  to authenticated
  using ((select public.is_admin()));

create policy "Users read own read receipts"
  on public.notification_reads
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Read state changes only go through the functions below.
revoke insert, update, delete on public.notifications from anon;
revoke update on public.notifications from authenticated;
revoke insert, update, delete on public.notification_reads from anon, authenticated;

-- The signed-in user's notifications, newest first. Broadcasts sent before
-- the user signed up are skipped.
create or replace function public.list_my_notifications(max_rows integer default 20)
returns table (
  id uuid,
  title text,
  body text,
  link text,
  created_at timestamptz,
  is_read boolean,
  is_broadcast boolean
)
language sql
stable
set search_path = ''
as $$
  select
    n.id,
    n.title,
    n.body,
    n.link,
    n.created_at,
    case when n.user_id is null then r.read_at is not null else n.read_at is not null end,
    n.user_id is null
  from public.notifications n
  left join public.notification_reads r
    on r.notification_id = n.id and r.user_id = (select auth.uid())
  where n.user_id = (select auth.uid())
     or (
       n.user_id is null
       and n.created_at >= (select p.created_at from public.profiles p where p.id = (select auth.uid()))
     )
  order by n.created_at desc
  limit least(greatest(max_rows, 1), 100);
$$;

create or replace function public.unread_notification_count()
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.notifications n
  left join public.notification_reads r
    on r.notification_id = n.id and r.user_id = (select auth.uid())
  where (n.user_id = (select auth.uid()) and n.read_at is null)
     or (
       n.user_id is null
       and r.read_at is null
       and n.created_at >= (select p.created_at from public.profiles p where p.id = (select auth.uid()))
     );
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, timezone('utc', now()))
  where id = p_notification_id and user_id = v_user_id;

  insert into public.notification_reads (notification_id, user_id)
  select n.id, v_user_id
  from public.notifications n
  where n.id = p_notification_id and n.user_id is null
  on conflict do nothing;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;

  update public.notifications
  set read_at = timezone('utc', now())
  where user_id = v_user_id and read_at is null;

  insert into public.notification_reads (notification_id, user_id)
  select n.id, v_user_id
  from public.notifications n
  where n.user_id is null
  on conflict do nothing;
end;
$$;

revoke execute on function public.list_my_notifications(integer) from public, anon;
revoke execute on function public.unread_notification_count() from public, anon;
revoke execute on function public.mark_notification_read(uuid) from public, anon;
revoke execute on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.list_my_notifications(integer) to authenticated;
grant execute on function public.unread_notification_count() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
