-- Shared trigger function to keep updated_at current on any table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Events that users create from the website.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  description text,
  starts_at timestamptz not null,
  location text not null check (char_length(trim(location)) > 0),
  price numeric(10, 2) not null default 0 check (price >= 0),
  image_url text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_created_by_idx on public.events (created_by);

alter table public.events enable row level security;

-- Anyone can browse events; only signed-in users can create them,
-- and only the creator can change or remove their own events.
create policy "Events are viewable by everyone"
  on public.events
  for select
  to anon, authenticated
  using (true);

create policy "Users can create events"
  on public.events
  for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy "Users can update own events"
  on public.events
  for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy "Users can delete own events"
  on public.events
  for delete
  to authenticated
  using ((select auth.uid()) = created_by);

drop trigger if exists set_events_updated_at on public.events;

create trigger set_events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

-- Tickets that users book for events.
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'used', 'cancelled')),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tickets_user_id_idx on public.tickets (user_id);
create index if not exists tickets_event_id_idx on public.tickets (event_id);

alter table public.tickets enable row level security;

-- Users see and book only their own tickets. Status changes (e.g. marking
-- a ticket as used at the door) are not allowed from the client.
create policy "Users can read own tickets"
  on public.tickets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can book tickets for themselves"
  on public.tickets
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and status = 'active');

drop trigger if exists set_tickets_updated_at on public.tickets;

create trigger set_tickets_updated_at
  before update on public.tickets
  for each row execute procedure public.set_updated_at();
