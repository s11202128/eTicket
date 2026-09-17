create extension if not exists pgcrypto;

alter table public.profiles add column if not exists phone text;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 140),
  description text not null default '',
  category text not null default 'General',
  venue text not null,
  location text not null,
  starts_at timestamptz not null,
  image_url text not null,
  price_cents integer not null check (price_cents >= 0),
  capacity integer not null check (capacity > 0),
  tickets_sold integer not null default 0 check (tickets_sold >= 0 and tickets_sold <= capacity),
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 10),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  booking_reference text not null unique,
  status text not null default 'active' check (status in ('active', 'used', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists tickets_user_id_created_at_idx on public.tickets (user_id, created_at desc);
create index if not exists events_published_starts_at_idx on public.events (published, starts_at);

alter table public.events enable row level security;
alter table public.tickets enable row level security;

create policy "Published events are publicly readable"
  on public.events for select
  to anon, authenticated
  using (published = true);

create policy "Users can read their tickets"
  on public.tickets for select
  to authenticated
  using (auth.uid() = user_id);

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

  insert into public.tickets (user_id, event_id, quantity, unit_price_cents, booking_reference)
  values (
    current_user_id,
    selected_event.id,
    p_quantity,
    selected_event.price_cents,
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
    'bookingReference', new_ticket.booking_reference,
    'qrData', new_ticket.booking_reference
  );
end;
$$;

revoke all on function public.book_event_ticket(uuid, integer) from public;
grant execute on function public.book_event_ticket(uuid, integer) to authenticated;

insert into public.events (id, title, description, category, venue, location, starts_at, image_url, price_cents, capacity, tickets_sold, featured, published)
values
  ('a5a71bf1-1929-4d86-a7aa-111111111111', 'Neon Harbor Festival', 'An open-air night of electronic music, immersive light installations, and waterfront food pop-ups.', 'Music', 'Pier 42', 'Brooklyn, NY', '2026-10-03 19:30:00+00', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=85', 5900, 900, 716, true, true),
  ('a5a71bf1-1929-4d86-a7aa-222222222222', 'Design Forward 2026', 'A one-day summit for product thinkers, creative technologists, and the teams shaping tomorrow''s interfaces.', 'Conference', 'The Glasshouse', 'New York, NY', '2026-10-17 13:00:00+00', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=85', 12900, 500, 424, false, true),
  ('a5a71bf1-1929-4d86-a7aa-333333333333', 'Midnight Jazz Sessions', 'An intimate late-night set featuring emerging jazz artists and a special guest quartet.', 'Music', 'The Blue Room', 'Chicago, IL', '2026-11-07 01:00:00+00', 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1400&q=85', 4200, 220, 172, false, true),
  ('a5a71bf1-1929-4d86-a7aa-444444444444', 'The Makers'' Table', 'Chef-led tastings, live demonstrations, and conversations with the people redefining neighborhood dining.', 'Food', 'Union Market', 'Washington, DC', '2026-11-21 17:00:00+00', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&q=85', 7500, 300, 188, false, true)
on conflict (id) do nothing;
