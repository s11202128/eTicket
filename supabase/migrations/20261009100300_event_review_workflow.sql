-- Three-sided platform, part 4: event review workflow, cancellation,
-- automatic completion and storage for organizers.

-- ---------------------------------------------------------------------------
-- submit_event_for_review: owner sends a draft (or changes-requested event)
-- to the admins.
-- ---------------------------------------------------------------------------
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
    v_problems := v_problems || 'add a description (at least 20 characters)';
  end if;
  if v_event.starts_at <= now() then
    v_problems := v_problems || 'choose a start date in the future';
  end if;
  if not exists (select 1 from public.ticket_types t where t.event_id = p_event_id) then
    v_problems := v_problems || 'add at least one ticket type';
  end if;
  if exists (
    select 1 from public.ticket_types t
    where t.event_id = p_event_id and t.sales_end is not null and t.sales_end > coalesce(v_event.end_at, v_event.starts_at)
  ) then
    v_problems := v_problems || 'ticket sales must end before the event ends';
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

-- ---------------------------------------------------------------------------
-- review_event: admin approves, requests changes, or rejects.
-- ---------------------------------------------------------------------------
create or replace function public.review_event(p_event_id uuid, p_decision text, p_note text default null)
returns public.events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;
  if v_event.status <> 'pending_review' then
    raise exception 'This event isn''t waiting for review.' using errcode = 'P0001';
  end if;

  v_status := case p_decision
    when 'approve' then 'published'
    when 'request_changes' then 'changes_requested'
    when 'reject' then 'rejected'
  end;
  if v_status is null then
    raise exception 'Decision must be approve, request_changes or reject.' using errcode = '22023';
  end if;
  if v_status <> 'published' and v_note is null then
    raise exception 'Add a note for the organizer.' using errcode = 'P0001';
  end if;

  perform set_config('eticket.trusted', 'on', true);
  update public.events
  set status = v_status,
      review_note = v_note,
      reviewed_at = timezone('utc', now()),
      reviewed_by = auth.uid()
  where id = p_event_id
  returning * into v_event;

  perform public.notify_user(
    v_event.organizer_id,
    case v_status
      when 'published' then format('%s is live', v_event.title)
      when 'changes_requested' then format('Changes requested for %s', v_event.title)
      else format('%s was not approved', v_event.title)
    end,
    coalesce(v_note, 'Your event is now visible to the public.'),
    '/manager/events/' || p_event_id
  );
  perform public.write_audit('event.' || p_decision, 'event', p_event_id::text,
    jsonb_build_object('title', v_event.title, 'note', v_note));

  return v_event;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_published_event: owner edits a live event.
--   Minor (applied, stays live): description, image_path, raising ticket quantities.
--   Major (back to pending_review): title, starts_at, end_at, location,
--   region, category_id, max_tickets_per_user, ticket prices, lowering quantities.
--   p_changes example:
--   {"description": "...", "starts_at": "2026-12-01T18:00:00Z",
--    "ticket_types": [{"id": "<uuid>", "price": 50, "quantity": 200}]}
-- ---------------------------------------------------------------------------
create or replace function public.update_published_event(p_event_id uuid, p_changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.events%rowtype;
  v_type public.ticket_types%rowtype;
  v_key text;
  v_item jsonb;
  v_major boolean := false;
  v_changed text[] := '{}';
  v_path text;
  v_qty integer;
  v_allowed constant text[] := array[
    'title', 'description', 'image_path', 'starts_at', 'end_at', 'location',
    'region', 'category_id', 'max_tickets_per_user', 'ticket_types'
  ];
begin
  if not public.is_approved_organizer() then
    raise exception 'Only approved organizers can edit events.' using errcode = '42501';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found or v_event.organizer_id is distinct from v_user_id then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;
  if v_event.status <> 'published' then
    raise exception 'Only live events are changed this way; edit drafts directly.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_changes) is distinct from 'object' then
    raise exception 'Changes must be an object.' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_changes) loop
    if not v_key = any(v_allowed) then
      raise exception '"%" can''t be changed on a live event.', v_key using errcode = '22023';
    end if;
  end loop;

  perform set_config('eticket.trusted', 'on', true);

  -- Minor changes
  if p_changes ? 'description' and (p_changes->>'description') is distinct from v_event.description then
    update public.events set description = nullif(trim(p_changes->>'description'), '') where id = p_event_id;
    v_changed := array_append(v_changed, 'description');
  end if;

  if p_changes ? 'image_path' and (p_changes->>'image_path') is distinct from v_event.image_path then
    v_path := nullif(trim(coalesce(p_changes->>'image_path', '')), '');
    if v_path is not null and v_path not like v_user_id::text || '/%' then
      raise exception 'Upload the image to your own folder.' using errcode = '42501';
    end if;
    update public.events set image_path = v_path where id = p_event_id;
    v_changed := array_append(v_changed, 'image_path');
  end if;

  -- Major changes
  if p_changes ? 'title' and (p_changes->>'title') is distinct from v_event.title then
    update public.events set title = trim(p_changes->>'title') where id = p_event_id;
    v_major := true; v_changed := array_append(v_changed, 'title');
  end if;
  if p_changes ? 'starts_at' and (p_changes->>'starts_at')::timestamptz is distinct from v_event.starts_at then
    if (p_changes->>'starts_at')::timestamptz <= now() then
      raise exception 'The start must be in the future.' using errcode = 'P0001';
    end if;
    update public.events set starts_at = (p_changes->>'starts_at')::timestamptz where id = p_event_id;
    v_major := true; v_changed := array_append(v_changed, 'starts_at');
  end if;
  if p_changes ? 'end_at' and (p_changes->>'end_at')::timestamptz is distinct from v_event.end_at then
    update public.events set end_at = (p_changes->>'end_at')::timestamptz where id = p_event_id;
    v_major := true; v_changed := array_append(v_changed, 'end_at');
  end if;
  if p_changes ? 'location' and (p_changes->>'location') is distinct from v_event.location then
    update public.events set location = trim(p_changes->>'location') where id = p_event_id;
    v_major := true; v_changed := array_append(v_changed, 'location');
  end if;
  if p_changes ? 'region' and (p_changes->>'region') is distinct from v_event.region then
    update public.events set region = p_changes->>'region' where id = p_event_id;
    v_major := true; v_changed := array_append(v_changed, 'region');
  end if;
  if p_changes ? 'category_id' and (p_changes->>'category_id')::uuid is distinct from v_event.category_id then
    update public.events set category_id = (p_changes->>'category_id')::uuid where id = p_event_id;
    v_major := true; v_changed := array_append(v_changed, 'category_id');
  end if;
  if p_changes ? 'max_tickets_per_user'
     and (p_changes->>'max_tickets_per_user')::integer is distinct from v_event.max_tickets_per_user then
    update public.events set max_tickets_per_user = (p_changes->>'max_tickets_per_user')::integer where id = p_event_id;
    v_major := true; v_changed := array_append(v_changed, 'max_tickets_per_user');
  end if;

  if p_changes ? 'ticket_types' then
    if jsonb_typeof(p_changes->'ticket_types') <> 'array' then
      raise exception 'ticket_types must be a list.' using errcode = '22023';
    end if;
    for v_item in select * from jsonb_array_elements(p_changes->'ticket_types') loop
      select * into v_type from public.ticket_types
      where id = (v_item->>'id')::uuid and event_id = p_event_id
      for update;
      if not found then
        raise exception 'Ticket type not found.' using errcode = 'P0002';
      end if;

      if v_item ? 'price' and (v_item->>'price')::numeric is distinct from v_type.price then
        update public.ticket_types set price = (v_item->>'price')::numeric where id = v_type.id;
        v_major := true; v_changed := array_append(v_changed, 'ticket_price');
      end if;

      if v_item ? 'quantity' then
        v_qty := (v_item->>'quantity')::integer; -- null = unlimited
        if v_qty is distinct from v_type.quantity then
          -- Lowering (or capping an unlimited type) needs review; raising doesn't.
          if v_qty is not null and (v_type.quantity is null or v_qty < v_type.quantity) then
            v_major := true;
          end if;
          update public.ticket_types set quantity = v_qty where id = v_type.id;
          v_changed := array_append(v_changed, 'ticket_quantity');
        end if;
      end if;
    end loop;
  end if;

  if v_major then
    update public.events
    set status = 'pending_review', submitted_at = timezone('utc', now()), review_note = null
    where id = p_event_id;
    perform public.notify_admins(
      'Live event changed: review needed',
      format('%s changed important details and is waiting for approval.', v_event.title),
      '/admin/reviews'
    );
  end if;

  if cardinality(v_changed) > 0 then
    perform public.write_audit('event.updated_live', 'event', p_event_id::text,
      jsonb_build_object('fields', v_changed, 'requires_review', v_major));
  end if;

  return jsonb_build_object(
    'requires_review', v_major,
    'status', case when v_major then 'pending_review' else 'published' end,
    'changed', to_jsonb(v_changed)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancellation: organizers request, admins cancel.
-- ---------------------------------------------------------------------------
create or replace function public.request_event_cancellation(p_event_id uuid, p_reason text default null)
returns public.events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  select * into v_event from public.events where id = p_event_id for update;
  if not found or v_event.organizer_id is distinct from auth.uid() then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;
  if v_event.status not in ('published', 'pending_review', 'changes_requested') then
    raise exception 'Only live or in-review events can be cancelled. Delete drafts instead.' using errcode = 'P0001';
  end if;
  if v_event.cancellation_requested then
    raise exception 'Cancellation was already requested.' using errcode = 'P0001';
  end if;

  perform set_config('eticket.trusted', 'on', true);
  update public.events
  set cancellation_requested = true, cancellation_reason = v_reason
  where id = p_event_id
  returning * into v_event;

  perform public.notify_admins(
    'Cancellation requested',
    format('The organizer of %s asked to cancel it.%s', v_event.title, coalesce(' Reason: ' || v_reason, '')),
    '/admin/cancellations'
  );
  perform public.write_audit('event.cancellation_requested', 'event', p_event_id::text,
    jsonb_build_object('reason', v_reason));

  return v_event;
end;
$$;

-- Replaces admin_cancel_event: cancels the event and its active tickets,
-- notifies every ticket holder and the organizer. Returns tickets cancelled.
create or replace function public.cancel_event(p_event_id uuid, p_note text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_cancelled integer;
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

  perform set_config('eticket.trusted', 'on', true);
  update public.events
  set status = 'cancelled', cancellation_requested = false
  where id = p_event_id;

  with cancelled as (
    update public.tickets
    set status = 'cancelled', cancelled_at = timezone('utc', now())
    where event_id = p_event_id and status = 'active'
    returning id
  )
  select count(*) into v_cancelled from cancelled;

  insert into public.notifications (user_id, title, body, link)
  select distinct t.user_id, 'Event cancelled',
    left(format('%s has been cancelled.', v_event.title) || coalesce(' ' || v_note, ''), 1000),
    '/tickets'
  from public.tickets t
  where t.event_id = p_event_id;

  perform public.notify_user(
    v_event.organizer_id,
    format('%s was cancelled', v_event.title),
    coalesce(v_note, format('%s ticket(s) were cancelled and holders notified.', v_cancelled)),
    '/manager/events/' || p_event_id
  );
  perform public.write_audit('event.cancelled', 'event', p_event_id::text,
    jsonb_build_object('note', v_note, 'tickets_cancelled', v_cancelled));

  return v_cancelled;
end;
$$;

drop function if exists public.admin_cancel_event(uuid, text);

-- ---------------------------------------------------------------------------
-- Completion: published events become 'completed' once they have ended
-- (end_at, or 6 hours after the start). Runs hourly via pg_cron.
-- ---------------------------------------------------------------------------
create or replace function public.complete_past_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform set_config('eticket.trusted', 'on', true);
  update public.events
  set status = 'completed'
  where status = 'published'
    and coalesce(end_at, starts_at + interval '6 hours') < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.submit_event_for_review(uuid) from public, anon;
revoke execute on function public.review_event(uuid, text, text) from public, anon;
revoke execute on function public.update_published_event(uuid, jsonb) from public, anon;
revoke execute on function public.request_event_cancellation(uuid, text) from public, anon;
revoke execute on function public.cancel_event(uuid, text) from public, anon;
revoke execute on function public.complete_past_events() from public, anon, authenticated;
grant execute on function public.submit_event_for_review(uuid) to authenticated;
grant execute on function public.review_event(uuid, text, text) to authenticated;
grant execute on function public.update_published_event(uuid, jsonb) to authenticated;
grant execute on function public.request_event_cancellation(uuid, text) to authenticated;
grant execute on function public.cancel_event(uuid, text) to authenticated;

create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'complete-past-events';
select cron.schedule('complete-past-events', '5 * * * *', 'select public.complete_past_events()');

select public.complete_past_events();

-- ---------------------------------------------------------------------------
-- Storage: organizer logos, and organizer uploads in event-images.
-- Files live under "<user id>/..."; admins keep full access.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('organizer-logos', 'organizer-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users manage own organizer logo (read)"
  on storage.objects for select to authenticated
  using (bucket_id = 'organizer-logos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

create policy "Users manage own organizer logo (upload)"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'organizer-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users manage own organizer logo (update)"
  on storage.objects for update to authenticated
  using (bucket_id = 'organizer-logos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'organizer-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users manage own organizer logo (delete)"
  on storage.objects for delete to authenticated
  using (bucket_id = 'organizer-logos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

create policy "Organizers read own event images"
  on storage.objects for select to authenticated
  using (bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_approved_organizer()));

create policy "Organizers upload own event images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_approved_organizer()));

create policy "Organizers update own event images"
  on storage.objects for update to authenticated
  using (bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_approved_organizer()))
  with check (bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_approved_organizer()));

create policy "Organizers delete own event images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_approved_organizer()));
