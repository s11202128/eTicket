-- Published upcoming events at or above p_threshold of their capacity.
create or replace function public.admin_events_near_capacity(p_threshold numeric default 0.8)
returns table (
  event_id uuid,
  title text,
  slug text,
  starts_at timestamptz,
  capacity integer,
  sold integer
)
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
    select e.id, e.title, e.slug, e.starts_at, e.capacity, count(t.id)::integer
    from public.events e
    left join public.tickets t
      on t.event_id = e.id and t.status in ('active', 'used')
    where e.status = 'published'
      and e.starts_at > now()
      and e.capacity is not null
    group by e.id
    having count(t.id) >= ceil(e.capacity * p_threshold)
    order by count(t.id)::numeric / e.capacity desc, e.starts_at;
end;
$$;

-- Headline numbers for the admin overview. "Today" and "this week" use the
-- admin's time zone (an IANA name such as 'Pacific/Port_Moresby').
create or replace function public.admin_stats(p_time_zone text default 'UTC')
returns table (
  tickets_today integer,
  tickets_this_week integer,
  upcoming_events integer,
  events_near_capacity integer,
  total_users integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_zone text := p_time_zone;
  v_local_now timestamp;
  v_day_start timestamptz;
  v_week_start timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_zone) then
    v_zone := 'UTC';
  end if;

  v_local_now := now() at time zone v_zone;
  v_day_start := date_trunc('day', v_local_now) at time zone v_zone;
  v_week_start := date_trunc('week', v_local_now) at time zone v_zone;

  return query
    select
      (select count(*) from public.tickets
        where created_at >= v_day_start and status in ('active', 'used'))::integer,
      (select count(*) from public.tickets
        where created_at >= v_week_start and status in ('active', 'used'))::integer,
      (select count(*) from public.events
        where status = 'published' and starts_at > now())::integer,
      (select count(*) from public.admin_events_near_capacity())::integer,
      (select count(*) from public.profiles)::integer;
end;
$$;

revoke execute on function public.admin_events_near_capacity(numeric) from public, anon;
revoke execute on function public.admin_stats(text) from public, anon;
grant execute on function public.admin_events_near_capacity(numeric) to authenticated;
grant execute on function public.admin_stats(text) to authenticated;
