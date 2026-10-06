-- URL-friendly slug: "Rock & Roll Night!" -> "rock-roll-night".
create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists categories_sort_order_idx on public.categories (sort_order, name);

alter table public.categories enable row level security;

create policy "Categories are public"
  on public.categories
  for select
  to anon, authenticated
  using (true);

create policy "Admins manage categories"
  on public.categories
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop trigger if exists set_categories_updated_at on public.categories;

create trigger set_categories_updated_at
  before update on public.categories
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Events: new columns
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists slug text,
  add column if not exists end_at timestamptz,
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'published', 'cancelled')),
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_order integer,
  add column if not exists image_path text,
  add column if not exists max_tickets_per_user integer not null default 4
    check (max_tickets_per_user between 1 and 50);

-- Events created before statuses existed were already live.
update public.events set status = 'published' where status = 'draft';

-- Backfill unique slugs for existing events.
update public.events
set slug = coalesce(nullif(public.slugify(title), ''), 'event') || '-' || substr(id::text, 1, 8)
where slug is null;

alter table public.events
  alter column slug set not null,
  add constraint events_slug_key unique (slug),
  add constraint events_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint events_end_after_start check (end_at is null or end_at > starts_at);

create index if not exists events_status_starts_at_idx on public.events (status, starts_at);
create index if not exists events_category_id_idx on public.events (category_id);
create index if not exists events_featured_idx on public.events (featured_order) where is_featured;

-- Keep events if the admin who created them is deleted.
alter table public.events alter column created_by drop not null;
alter table public.events drop constraint if exists events_created_by_fkey;
alter table public.events
  add constraint events_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

-- Events with tickets can't be deleted (cancel them instead).
alter table public.tickets drop constraint if exists tickets_event_id_fkey;
alter table public.tickets
  add constraint tickets_event_id_fkey
  foreign key (event_id) references public.events(id) on delete restrict;

-- ---------------------------------------------------------------------------
-- Events: access rules
-- ---------------------------------------------------------------------------
drop policy if exists "Events are viewable by everyone" on public.events;
drop policy if exists "Users can create events" on public.events;
drop policy if exists "Users can update own events" on public.events;
drop policy if exists "Users can delete own events" on public.events;

create policy "Published events are public"
  on public.events
  for select
  to anon, authenticated
  using (status = 'published');

-- Ticket holders can still see an event after it is cancelled or unpublished.
create policy "Ticket holders can read their events"
  on public.events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.event_id = events.id and t.user_id = (select auth.uid())
    )
  );

create policy "Admins manage events"
  on public.events
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke insert, update, delete on public.events from anon;

-- ---------------------------------------------------------------------------
-- Site content (homepage hero, announcement bar, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.site_content (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

alter table public.site_content enable row level security;

create policy "Site content is public"
  on public.site_content
  for select
  to anon, authenticated
  using (true);

create policy "Admins manage site content"
  on public.site_content
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke insert, update, delete on public.site_content from anon;

create or replace function public.stamp_site_content()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists stamp_site_content on public.site_content;

create trigger stamp_site_content
  before update on public.site_content
  for each row execute procedure public.stamp_site_content();

insert into public.site_content (key, value) values
  ('hero', jsonb_build_object(
    'title', 'Find your next live experience',
    'subtitle', 'Concerts, sports, festivals and more. Book your tickets in seconds.',
    'image_path', null,
    'cta_text', 'Browse events'
  )),
  ('announcement', jsonb_build_object(
    'text', '',
    'enabled', false
  ))
on conflict (key) do nothing;
