-- Keep existing installations compatible with the Pacific/global catalogue.
alter table public.events
  add column if not exists currency text not null default 'USD'
  check (currency ~ '^[A-Z]{3}$');

alter table public.tickets
  add column if not exists currency text not null default 'USD'
  check (currency ~ '^[A-Z]{3}$');

-- Existing prices were displayed in USD before currencies were stored. Keep
-- that historical meaning, while making SBD the default for new catalogue data.
alter table public.events alter column currency set default 'SBD';
alter table public.tickets alter column currency set default 'SBD';

update public.events set
  title = 'Solomon Islands Music & Arts Festival',
  description = 'A celebration of Solomon Islands music, dance, visual arts, and food beside the Honiara waterfront.',
  category = 'Festival', venue = 'Heritage Park', location = 'Honiara, Solomon Islands',
  starts_at = '2026-10-03 08:30:00+00', price_cents = 25000, currency = 'SBD'
where id = 'a5a71bf1-1929-4d86-a7aa-111111111111';

update public.events set
  title = 'Pacific Innovation Summit 2026',
  description = 'A regional gathering for entrepreneurs, technologists, and communities building a resilient Pacific future.',
  category = 'Conference', venue = 'Vodafone Arena', location = 'Suva, Fiji',
  price_cents = 12900, currency = 'FJD'
where id = 'a5a71bf1-1929-4d86-a7aa-222222222222';

update public.events set
  title = 'Pasifika Nights Auckland',
  description = 'An evening of Pacific music, contemporary dance, fashion, and food from across the Blue Pacific.',
  category = 'Music', venue = 'Aotea Square', location = 'Auckland, New Zealand',
  price_cents = 5500, currency = 'NZD'
where id = 'a5a71bf1-1929-4d86-a7aa-333333333333';

update public.events set
  title = 'Global Island Creators Forum',
  description = 'Island artists, filmmakers, and digital creators meet global partners for two days of ideas and collaboration.',
  category = 'Conference', venue = 'Barbican Centre', location = 'London, United Kingdom',
  price_cents = 7500, currency = 'GBP'
where id = 'a5a71bf1-1929-4d86-a7aa-444444444444';

create or replace function public.book_event_ticket(p_event_id uuid, p_quantity integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  selected_event public.events%rowtype;
  new_ticket public.tickets%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 10 then
    raise exception 'Choose between 1 and 10 tickets';
  end if;

  select * into selected_event
  from public.events
  where id = p_event_id and published = true
  for update;

  if not found then
    raise exception 'Event not found';
  end if;

  if selected_event.starts_at <= now() then
    raise exception 'This event has already started';
  end if;

  if selected_event.capacity - selected_event.tickets_sold < p_quantity then
    raise exception 'There are not enough tickets remaining';
  end if;

  update public.events
  set tickets_sold = tickets_sold + p_quantity,
      updated_at = timezone('utc', now())
  where id = selected_event.id;

  insert into public.tickets (user_id, event_id, quantity, unit_price_cents, currency, booking_reference)
  values (
    current_user_id,
    selected_event.id,
    p_quantity,
    selected_event.price_cents,
    selected_event.currency,
    'ET-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  )
  returning * into new_ticket;

  return jsonb_build_object(
    'id', new_ticket.id,
    'eventId', selected_event.id,
    'eventTitle', selected_event.title,
    'startsAt', selected_event.starts_at,
    'venue', selected_event.venue,
    'location', selected_event.location,
    'imageUrl', selected_event.image_url,
    'status', new_ticket.status,
    'quantity', new_ticket.quantity,
    'totalPriceCents', new_ticket.quantity * new_ticket.unit_price_cents,
    'currency', new_ticket.currency,
    'bookingReference', new_ticket.booking_reference,
    'qrData', new_ticket.booking_reference
  );
end;
$$;

revoke all on function public.book_event_ticket(uuid, integer) from public;
grant execute on function public.book_event_ticket(uuid, integer) to authenticated;
