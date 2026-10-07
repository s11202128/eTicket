-- Fix: submit_event_for_review built its list of problems with
-- `text[] || 'literal'`, which Postgres reads as an array literal and fails
-- with "malformed array literal". Use array_append instead.

create or replace function public.submit_event_for_review(p_event_id uuid)
returns public.events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_problems text[] := '{}';
begin
  if not public.is_approved_organizer() then
    raise exception 'Only approved organizers can submit events.' using errcode = '42501';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found or v_event.organizer_id is distinct from auth.uid() then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;

  if v_event.status not in ('draft', 'changes_requested') then
    raise exception 'Only drafts or events with requested changes can be submitted.' using errcode = 'P0001';
  end if;

  if char_length(trim(coalesce(v_event.description, ''))) < 20 then
    v_problems := array_append(v_problems, 'add a description (at least 20 characters)');
  end if;
  if v_event.starts_at <= now() then
    v_problems := array_append(v_problems, 'choose a start date in the future');
  end if;
  if not exists (select 1 from public.ticket_types t where t.event_id = p_event_id) then
    v_problems := array_append(v_problems, 'add at least one ticket type');
  end if;
  if exists (
    select 1 from public.ticket_types t
    where t.event_id = p_event_id and t.sales_end is not null and t.sales_end > coalesce(v_event.end_at, v_event.starts_at)
  ) then
    v_problems := array_append(v_problems, 'ticket sales must end before the event ends');
  end if;

  if cardinality(v_problems) > 0 then
    raise exception 'Before submitting: %.', array_to_string(v_problems, '; ') using errcode = 'P0001';
  end if;

  perform set_config('eticket.trusted', 'on', true);
  update public.events
  set status = 'pending_review', submitted_at = timezone('utc', now())
  where id = p_event_id
  returning * into v_event;

  perform public.notify_admins(
    'Event submitted for review',
    format('%s is waiting for approval.', v_event.title),
    '/admin/reviews'
  );
  perform public.write_audit('event.submitted', 'event', p_event_id::text, jsonb_build_object('title', v_event.title));

  return v_event;
end;
$$;
