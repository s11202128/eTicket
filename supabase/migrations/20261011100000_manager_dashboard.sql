-- Phase 3 (Event Manager dashboard):
-- 1. update_organizer_profile(): approved organizers edit their public info
--    (the table itself only lets owners edit while the application is pending).
-- 2. list_event_staff(): door staff with names/emails for the event's organizer.
-- 3. get_check_in_progress(): live "X / Y checked in" for anyone who can scan.
-- 4. list_my_recent_bookings(): latest bookings across the organizer's events.

create or replace function public.update_organizer_profile(
  p_organization_name text,
  p_phone text default null,
  p_city text default null,
  p_website text default null,
  p_event_types text[] default '{}',
  p_description text default null,
  p_logo_path text default null
)
returns public.organizer_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_logo text := nullif(trim(coalesce(p_logo_path, '')), '');
  v_row public.organizer_profiles;
begin
  if v_user_id is null then
    raise exception 'Please sign in.' using errcode = '28000';
  end if;
  if not public.is_approved_organizer() then
    raise exception 'Only approved organizers can edit their organizer profile here.' using errcode = '42501';
  end if;
  if v_logo is not null and v_logo not like v_user_id::text || '/%' then
    raise exception 'Upload the logo to your own folder.' using errcode = '42501';
  end if;

  update public.organizer_profiles
  set organization_name = trim(p_organization_name),
      phone = nullif(trim(coalesce(p_phone, '')), ''),
      city = nullif(trim(coalesce(p_city, '')), ''),
      website = nullif(trim(coalesce(p_website, '')), ''),
      event_types = coalesce(p_event_types, '{}'),
      description = nullif(trim(coalesce(p_description, '')), ''),
      logo_path = v_logo
  where user_id = v_user_id
  returning * into v_row;

  perform public.write_audit('organizer.profile_updated', 'organizer', v_user_id::text,
    jsonb_build_object('organization_name', v_row.organization_name));

  return v_row;
end;
$$;

revoke execute on function public.update_organizer_profile(text, text, text, text, text[], text, text) from public, anon;
grant execute on function public.update_organizer_profile(text, text, text, text, text[], text, text) to authenticated;

create or replace function public.list_event_staff(p_event_id uuid)
returns table (user_id uuid, full_name text, email text, added_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_event_owner(p_event_id)) then
    raise exception 'Only the event organizer can see door staff.' using errcode = '42501';
  end if;

  return query
    select s.user_id, p.full_name, p.email, s.created_at
    from public.event_staff s
    join public.profiles p on p.id = s.user_id
    where s.event_id = p_event_id
    order by s.created_at;
end;
$$;

revoke execute on function public.list_event_staff(uuid) from public, anon;
grant execute on function public.list_event_staff(uuid) to authenticated;

-- Tickets that can still be used at the door (active) or already were (used).
create or replace function public.get_check_in_progress(p_event_id uuid)
returns table (checked_in integer, total integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_check_in(p_event_id) then
    raise exception 'You can''t check in tickets for this event.' using errcode = '42501';
  end if;

  return query
    select
      count(*) filter (where t.status = 'used')::integer,
      count(*) filter (where t.status in ('active', 'used'))::integer
    from public.tickets t
    where t.event_id = p_event_id;
end;
$$;

revoke execute on function public.get_check_in_progress(uuid) from public, anon;
grant execute on function public.get_check_in_progress(uuid) to authenticated;

create or replace function public.list_my_recent_bookings(p_limit integer default 10)
returns table (
  ticket_id uuid,
  event_id uuid,
  event_title text,
  ticket_type_name text,
  holder_name text,
  status text,
  booked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, e.id, e.title, tt.name, p.full_name, t.status, t.created_at
  from public.tickets t
  join public.events e on e.id = t.event_id
  join public.ticket_types tt on tt.id = t.ticket_type_id
  left join public.profiles p on p.id = t.user_id
  where e.organizer_id = (select auth.uid())
  order by t.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

revoke execute on function public.list_my_recent_bookings(integer) from public, anon;
grant execute on function public.list_my_recent_bookings(integer) to authenticated;
