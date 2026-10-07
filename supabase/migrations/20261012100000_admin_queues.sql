-- Phase 4 (admin queues):
-- 1. admin_queue_counts(): badge numbers for the admin sidebar.
-- 2. decline_event_cancellation(): admins turn down an organizer's
--    cancellation request (the event stays live; the organizer is told why).

create or replace function public.admin_queue_counts()
returns table (pending_organizers integer, pending_events integer, cancellation_requests integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  return query select
    (select count(*)::integer from public.organizer_profiles where status = 'pending'),
    (select count(*)::integer from public.events where status = 'pending_review'),
    (select count(*)::integer from public.events where cancellation_requested and status <> 'cancelled');
end;
$$;

revoke execute on function public.admin_queue_counts() from public, anon;
grant execute on function public.admin_queue_counts() to authenticated;

create or replace function public.decline_event_cancellation(p_event_id uuid, p_note text)
returns public.events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  if v_note is null then
    raise exception 'Tell the organizer why the event isn''t being cancelled.' using errcode = 'P0001';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;
  if not v_event.cancellation_requested then
    raise exception 'There is no cancellation request for this event.' using errcode = 'P0001';
  end if;

  update public.events
  set cancellation_requested = false, cancellation_reason = null
  where id = p_event_id
  returning * into v_event;

  if v_event.organizer_id is not null then
    perform public.notify_user(
      v_event.organizer_id,
      'Cancellation request declined',
      format('%s stays on sale: %s', v_event.title, v_note),
      '/manager/events/' || p_event_id::text
    );
  end if;
  perform public.write_audit('event.cancellation_declined', 'event', p_event_id::text,
    jsonb_build_object('title', v_event.title, 'note', v_note));

  return v_event;
end;
$$;

revoke execute on function public.decline_event_cancellation(uuid, text) from public, anon;
grant execute on function public.decline_event_cancellation(uuid, text) to authenticated;
