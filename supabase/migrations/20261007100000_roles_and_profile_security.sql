-- Roles: 'user' (default), 'staff' (door check-in), 'admin' (manages everything).
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'staff', 'admin'));

-- Role helpers for policies and functions. SECURITY DEFINER so they can read
-- profiles without tripping over profiles' own row-level security.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('staff', 'admin')
  );
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_staff_or_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff_or_admin() to authenticated;

-- Admins can see and edit every profile (e.g. to change roles).
create policy "Admins can read all profiles"
  on public.profiles
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can update any profile"
  on public.profiles
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Writable columns. role is included so admins can change it; the trigger
-- below is what stops everyone else.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, role) on public.profiles to authenticated;

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    -- No signed-in user means the SQL editor or the service role, which is
    -- how the first admin gets created.
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

revoke execute on function public.guard_profile_role() from public, anon, authenticated;

drop trigger if exists guard_profile_role on public.profiles;

create trigger guard_profile_role
  before update on public.profiles
  for each row execute procedure public.guard_profile_role();
