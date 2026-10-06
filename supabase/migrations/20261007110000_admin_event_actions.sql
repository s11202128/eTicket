-- Admin actions that must happen atomically on the server.

-- Cancel an event: mark it cancelled, cancel its active tickets and notify
-- every holder. Returns the number of tickets cancelled.
create or replace function public.admin_cancel_event(p_event_id uuid, p_reason text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_cancelled integer;
  v_body text;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  select * into v_event from public.events where id = p_event_id for update;

  if not found then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;

  if v_event.status = 'cancelled' then
    raise exception 'This event is already cancelled.' using errcode = 'P0001';
  end if;

  update public.events set status = 'cancelled' where id = p_event_id;

  with cancelled as (
    update public.tickets
    set status = 'cancelled', cancelled_at = timezone('utc', now())
    where event_id = p_event_id and status = 'active'
    returning user_id
  )
  select count(*) into v_cancelled from cancelled;

  v_body := format('%s has been cancelled.', v_event.title);
  if nullif(trim(coalesce(p_reason, '')), '') is not null then
    v_body := v_body || ' ' || left(trim(p_reason), 500);
  end if;

  insert into public.notifications (user_id, title, body, link)
  select distinct t.user_id, 'Event cancelled', v_body, '/tickets'
  from public.tickets t
  where t.event_id = p_event_id;

  return v_cancelled;
end;
$$;

-- Message everyone holding a ticket (active or used) for an event.
-- Returns the number of people notified.
create or replace function public.admin_notify_event_holders(
  p_event_id uuid,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  insert into public.notifications (user_id, title, body, link, created_by)
  select distinct t.user_id, p_title, nullif(trim(coalesce(p_body, '')), ''),
    nullif(trim(coalesce(p_link, '')), ''), auth.uid()
  from public.tickets t
  where t.event_id = p_event_id and t.status in ('active', 'used');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Replace the featured list: the given events become featured in this order,
-- all others are un-featured.
create or replace function public.admin_set_featured_events(p_event_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  update public.events
  set is_featured = false, featured_order = null
  where is_featured and not (id = any(coalesce(p_event_ids, '{}')));

  update public.events e
  set is_featured = true, featured_order = array_position(p_event_ids, e.id)
  where e.id = any(coalesce(p_event_ids, '{}'));
end;
$$;

revoke execute on function public.admin_cancel_event(uuid, text) from public, anon;
revoke execute on function public.admin_notify_event_holders(uuid, text, text, text) from public, anon;
revoke execute on function public.admin_set_featured_events(uuid[]) from public, anon;
grant execute on function public.admin_cancel_event(uuid, text) to authenticated;
grant execute on function public.admin_notify_event_holders(uuid, text, text, text) to authenticated;
grant execute on function public.admin_set_featured_events(uuid[]) to authenticated;
