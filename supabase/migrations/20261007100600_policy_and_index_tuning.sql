-- Performance tuning from the Supabase advisor. Access rules are unchanged:
-- overlapping permissive policies are merged into one per action, and
-- auth.uid() is wrapped in a sub-select so it is evaluated once per query.

-- profiles
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;

create policy "Read own profile, admins read all"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Update own profile, admins update all"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- tickets
drop policy if exists "Users can read own tickets" on public.tickets;
drop policy if exists "Admins can read all tickets" on public.tickets;

create policy "Read own tickets, admins read all"
  on public.tickets
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- events
drop policy if exists "Published events are public" on public.events;
drop policy if exists "Ticket holders can read their events" on public.events;
drop policy if exists "Admins manage events" on public.events;

create policy "Anyone reads published events"
  on public.events
  for select
  to anon
  using (status = 'published');

-- Signed-in: published events, events they hold tickets for, or everything for admins.
create policy "Signed-in users read visible events"
  on public.events
  for select
  to authenticated
  using (
    status = 'published'
    or (select public.is_admin())
    or exists (
      select 1 from public.tickets t
      where t.event_id = events.id and t.user_id = (select auth.uid())
    )
  );

create policy "Admins insert events"
  on public.events for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update events"
  on public.events for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete events"
  on public.events for delete to authenticated
  using ((select public.is_admin()));

-- categories: public read + separate admin write policies
drop policy if exists "Admins manage categories" on public.categories;

create policy "Admins insert categories"
  on public.categories for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update categories"
  on public.categories for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete categories"
  on public.categories for delete to authenticated
  using ((select public.is_admin()));

-- site_content: public read + separate admin write policies
drop policy if exists "Admins manage site content" on public.site_content;

create policy "Admins insert site content"
  on public.site_content for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update site content"
  on public.site_content for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete site content"
  on public.site_content for delete to authenticated
  using ((select public.is_admin()));

-- Indexes for foreign keys; tickets_event_status_idx already covers event_id.
create index if not exists notification_reads_user_id_idx on public.notification_reads (user_id);
create index if not exists notifications_created_by_idx on public.notifications (created_by);
create index if not exists site_content_updated_by_idx on public.site_content (updated_by);
create index if not exists tickets_checked_in_by_idx on public.tickets (checked_in_by);
drop index if exists public.tickets_event_id_idx;
