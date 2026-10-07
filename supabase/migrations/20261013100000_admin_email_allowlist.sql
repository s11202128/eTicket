-- Admin access only for authorized emails.
-- A person is an admin only when their profile role is 'admin' AND their
-- login email is in public.admin_emails. Every admin check (RLS policies,
-- functions, the route guard) goes through is_admin(), so this applies
-- everywhere.
--
-- The list can't be read or changed through the website or the API (no
-- policies, no grants). Manage it in the Supabase SQL editor:
--   insert into public.admin_emails (email) values ('someone@example.com');
--   update public.profiles set role = 'admin'
--     where id = (select id from auth.users where lower(email) = 'someone@example.com');
--   delete from public.admin_emails where email = 'someone@example.com';

create table if not exists public.admin_emails (
  email text primary key check (email = lower(trim(email)) and email like '%@%'),
  added_at timestamptz not null default timezone('utc', now()),
  note text
);

alter table public.admin_emails enable row level security;
revoke all on public.admin_emails from anon, authenticated;

insert into public.admin_emails (email, note)
values ('limanikukit@gmail.com', 'Site owner')
on conflict (email) do nothing;

-- Uses the login email from auth.users (users can't edit it from the app).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    join public.admin_emails a on a.email = lower(u.email)
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

-- The admin role can only be given to authorized emails, by anyone
-- (including the SQL editor), so the role can never be misleading.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if new.role = 'admin' and not exists (
      select 1 from auth.users u join public.admin_emails a on a.email = lower(u.email) where u.id = new.id
    ) then
      raise exception 'Only authorized admin emails can have the admin role.' using errcode = '42501';
    end if;

    if (select auth.uid()) is null then
      return new;
    end if;

    if not public.is_admin() then
      raise exception 'Only admins can change roles.' using errcode = '42501';
    end if;

    if old.id = (select auth.uid()) and old.role = 'admin' then
      raise exception 'You cannot remove your own admin role.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- The route guard and login use this: report 'admin' only for real admins.
create or replace function public.get_my_access()
returns table (role text, organizer_status text, staff_event_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when p.role = 'admin' and not public.is_admin() then 'attendee' else p.role end,
    o.status,
    (select count(*)::integer from public.event_staff s where s.user_id = p.id)
  from public.profiles p
  left join public.organizer_profiles o on o.user_id = p.id
  where p.id = (select auth.uid());
$$;

-- Which emails may be made admin, for the admin Users screen (admins only).
create or replace function public.list_admin_eligible(p_user_ids uuid[])
returns table (user_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  return query
    select u.id from auth.users u join public.admin_emails a on a.email = lower(u.email)
    where u.id = any(p_user_ids);
end;
$$;

revoke execute on function public.list_admin_eligible(uuid[]) from public, anon;
grant execute on function public.list_admin_eligible(uuid[]) to authenticated;
