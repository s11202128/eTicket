-- Three-sided platform, part 2: event ownership, review workflow columns,
-- door staff and the access rules that go with them.

-- ---------------------------------------------------------------------------
-- Event workflow columns and statuses
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists organizer_id uuid references public.profiles(id) on delete set null,
  add column if not exists review_note text check (review_note is null or char_length(review_note) <= 2000),
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists cancellation_requested boolean not null default false,
  add column if not exists cancellation_reason text
    check (cancellation_reason is null or char_length(cancellation_reason) <= 1000);

-- Existing events were created by an admin and stay platform-hosted (organizer_id null).

alter table public.events drop constraint if exists events_status_check;
alter table public.events
  add constraint events_status_check check (status in (
    'draft', 'pending_review', 'changes_requested', 'published', 'rejected', 'cancelled', 'completed'
  ));

create index if not exists events_organizer_idx on public.events (organizer_id, starts_at);
create index if not exists events_reviewed_by_idx on public.events (reviewed_by);
create index if not exists events_review_queue_idx on public.events (status, submitted_at)
  where status = 'pending_review' or cancellation_requested;

-- ---------------------------------------------------------------------------
-- Door staff per event
-- ---------------------------------------------------------------------------
create table if not exists public.event_staff (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (event_id, user_id)
);

create index if not exists event_staff_user_idx on public.event_staff (user_id);
create index if not exists event_staff_invited_by_idx on public.event_staff (invited_by);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so they can be used inside policies without
-- recursion; fixed search_path)
-- ---------------------------------------------------------------------------
create or replace function public.is_event_owner(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events
    where id = p_event_id and organizer_id = (select auth.uid())
  );
$$;

create or replace function public.is_event_staff(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.event_staff
    where event_id = p_event_id and user_id = (select auth.uid())
  );
$$;

-- Admins, the event's organizer, or door staff assigned to the event.
create or replace function public.can_check_in(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or public.is_event_owner(p_event_id) or public.is_event_staff(p_event_id);
$$;

-- Owner may edit the event's details and ticket types (draft or changes requested).
create or replace function public.owner_can_edit_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_approved_organizer() and exists (
    select 1 from public.events
    where id = p_event_id
      and organizer_id = (select auth.uid())
      and status in ('draft', 'changes_requested')
  );
$$;

revoke execute on function public.is_event_owner(uuid) from public, anon;
revoke execute on function public.is_event_staff(uuid) from public, anon;
revoke execute on function public.can_check_in(uuid) from public, anon;
revoke execute on function public.owner_can_edit_event(uuid) from public, anon;
grant execute on function public.is_event_owner(uuid) to authenticated;
grant execute on function public.is_event_staff(uuid) to authenticated;
grant execute on function public.can_check_in(uuid) to authenticated;
grant execute on function public.owner_can_edit_event(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Events: access rules
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone reads published events" on public.events;
drop policy if exists "Signed-in users read visible events" on public.events;
drop policy if exists "Admins insert events" on public.events;
drop policy if exists "Admins update events" on public.events;
drop policy if exists "Admins delete events" on public.events;

create policy "Anyone reads live and past events"
  on public.events for select to anon
  using (status in ('published', 'completed'));

-- Signed in: live/past events, plus own events (organizers), events with
-- door-staff duty, events you hold tickets for, and everything for admins.
create policy "Signed-in users read visible events"
  on public.events for select to authenticated
  using (
    status in ('published', 'completed')
    or organizer_id = (select auth.uid())
    or (select public.is_admin())
    or public.is_event_staff(id)
    or exists (
      select 1 from public.tickets t
      where t.event_id = events.id and t.user_id = (select auth.uid())
    )
  );

-- Admins create events in any status (published directly); approved
-- organizers create drafts that they own.
create policy "Admins and approved organizers create events"
  on public.events for insert to authenticated
  with check (
    (select public.is_admin())
    or (
      (select public.is_approved_organizer())
      and organizer_id = (select auth.uid())
      and status = 'draft'
    )
  );

-- Organizers edit only their own drafts / events with changes requested.
-- Live events change through update_published_event().
create policy "Admins and owners of editable events update"
  on public.events for update to authenticated
  using (
    (select public.is_admin())
    or (
      organizer_id = (select auth.uid())
      and status in ('draft', 'changes_requested')
      and (select public.is_approved_organizer())
    )
  )
  with check (
    (select public.is_admin())
    or (organizer_id = (select auth.uid()) and status in ('draft', 'changes_requested'))
  );

-- Owners delete only drafts (events with tickets can never be deleted).
create policy "Admins and owners of drafts delete"
  on public.events for delete to authenticated
  using (
    (select public.is_admin())
    or (
      organizer_id = (select auth.uid())
      and status = 'draft'
      and (select public.is_approved_organizer())
    )
  );

-- Workflow columns change only through the review/submit functions (which
-- set the transaction-local flag eticket.trusted) or by an admin. Organizer
-- inserts are forced to a clean draft they own.
create or replace function public.guard_event_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('eticket.trusted', true), '') = 'on'
     or (select auth.uid()) is null
     or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.organizer_id := (select auth.uid());
    new.created_by := (select auth.uid());
    new.is_featured := false;
    new.featured_order := null;
    new.review_note := null;
    new.submitted_at := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.cancellation_requested := false;
    new.cancellation_reason := null;
    return new;
  end if;

  if new.status is distinct from old.status
     or new.organizer_id is distinct from old.organizer_id
     or new.created_by is distinct from old.created_by
     or new.review_note is distinct from old.review_note
     or new.submitted_at is distinct from old.submitted_at
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.is_featured is distinct from old.is_featured
     or new.featured_order is distinct from old.featured_order
     or new.cancellation_requested is distinct from old.cancellation_requested
     or new.cancellation_reason is distinct from old.cancellation_reason then
    raise exception 'This field can only be changed through the event review actions.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_event_columns() from public, anon, authenticated;

drop trigger if exists guard_event_columns on public.events;
create trigger guard_event_columns
  before insert or update on public.events
  for each row execute procedure public.guard_event_columns();

-- ---------------------------------------------------------------------------
-- Event staff: access rules + invite by email
-- ---------------------------------------------------------------------------
alter table public.event_staff enable row level security;

create policy "Staff, event owners and admins read staff"
  on public.event_staff for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or public.is_event_owner(event_id)
  );

create policy "Event owners and admins remove staff"
  on public.event_staff for delete to authenticated
  using ((select public.is_admin()) or (public.is_event_owner(event_id) and (select public.is_approved_organizer())));

-- Adding staff goes through add_event_staff() (looks the person up by email).
revoke insert, update on public.event_staff from anon, authenticated;
revoke delete on public.event_staff from anon;

-- Returns 'added', 'already_staff' or 'no_account' (person must sign up first).
create or replace function public.add_event_staff(p_event_id uuid, p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_title text;
begin
  if not (public.is_admin() or (public.is_event_owner(p_event_id) and public.is_approved_organizer())) then
    raise exception 'Only the event organizer can add door staff.' using errcode = '42501';
  end if;

  select title into v_title from public.events where id = p_event_id;
  if v_title is null then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;

  select id into v_user_id from public.profiles where lower(email) = lower(trim(p_email));
  if v_user_id is null then
    return 'no_account';
  end if;

  insert into public.event_staff (event_id, user_id, invited_by)
  values (p_event_id, v_user_id, auth.uid())
  on conflict do nothing;

  if not found then
    return 'already_staff';
  end if;

  perform public.notify_user(
    v_user_id,
    'You are door staff',
    format('You can now check in guests for %s.', v_title),
    '/manager/check-in'
  );
  perform public.write_audit('event.staff_added', 'event', p_event_id::text, jsonb_build_object('user_id', v_user_id));

  return 'added';
end;
$$;

revoke execute on function public.add_event_staff(uuid, text) from public, anon;
grant execute on function public.add_event_staff(uuid, text) to authenticated;
