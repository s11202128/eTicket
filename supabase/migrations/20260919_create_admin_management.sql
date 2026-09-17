-- Add a protected platform administrator role and management policies.
update public.profiles set role = 'customer' where role = 'user' or role is null;
alter table public.profiles alter column role set default 'customer';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer', 'admin'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- A customer may update their own profile fields, but never promote their own role.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update of role on public.profiles
  for each row execute procedure public.protect_profile_role();

create policy "Admins can read every event"
  on public.events for select
  to authenticated
  using (public.is_admin());

create policy "Admins can create events"
  on public.events for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update events"
  on public.events for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete empty events"
  on public.events for delete
  to authenticated
  using (public.is_admin() and tickets_sold = 0);

create policy "Admins can read every ticket"
  on public.tickets for select
  to authenticated
  using (public.is_admin());

-- Promote the first administrator from the Supabase SQL editor after signup:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
