-- update_published_event: starts_at and end_at are now written in ONE update.
-- Before, moving a live event later (new start after the old end) applied the
-- start first and failed on events_end_after_start. Both times are checked
-- together and a clear message is raised instead of the raw constraint error.

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
  v_starts timestamptz;
  v_ends timestamptz;
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
  -- Start and end are checked together and saved in one update, so moving an
  -- event later doesn't briefly put the new start after the old end.
  v_starts := case when p_changes ? 'starts_at' then (p_changes->>'starts_at')::timestamptz else v_event.starts_at end;
  v_ends := case when p_changes ? 'end_at' then (p_changes->>'end_at')::timestamptz else v_event.end_at end;
  if v_starts is distinct from v_event.starts_at or v_ends is distinct from v_event.end_at then
    if v_starts is null then
      raise exception 'Enter a start date and time.' using errcode = '22023';
    end if;
    if v_starts is distinct from v_event.starts_at and v_starts <= now() then
      raise exception 'The start must be in the future.' using errcode = 'P0001';
    end if;
    if v_ends is not null and v_ends <= v_starts then
      raise exception 'The end must be after the start.' using errcode = 'P0001';
    end if;
    update public.events set starts_at = v_starts, end_at = v_ends where id = p_event_id;
    v_major := true;
    if v_starts is distinct from v_event.starts_at then v_changed := array_append(v_changed, 'starts_at'); end if;
    if v_ends is distinct from v_event.end_at then v_changed := array_append(v_changed, 'end_at'); end if;
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
