-- Audit columns for check-in and cancellation.
alter table public.tickets
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_in_by uuid references auth.users(id) on delete set null,
  add column if not exists cancelled_at timestamptz;

-- Lets the API embed the holder's profile when admins list tickets.
alter table public.tickets
  add constraint tickets_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

create index if not exists tickets_event_status_idx on public.tickets (event_id, status);
create index if not exists tickets_created_at_idx on public.tickets (created_at desc);

-- Users may now hold several tickets per event (events.max_tickets_per_user).
drop index if exists public.tickets_one_active_per_user_event;

-- Booking and cancelling now go through the functions below, never direct writes.
drop trigger if exists check_ticket_booking on public.tickets;
drop function if exists public.check_ticket_booking();
drop policy if exists "Users can book tickets for themselves" on public.tickets;
drop policy if exists "Users can cancel own active tickets" on public.tickets;
revoke update (status) on public.tickets from authenticated;
revoke insert, update, delete on public.tickets from anon, authenticated;

create policy "Admins can read all tickets"
  on public.tickets
  for select
  to authenticated
  using ((select public.is_admin()));

-- Replaced by check_in_ticket().
drop function if exists public.redeem_ticket(text);

-- Seats taken (active + used) per event. Draft events stay hidden from non-admins.
create or replace function public.get_event_booked_counts(event_ids uuid[])
returns table (event_id uuid, booked integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.event_id, count(*)::integer
  from public.tickets t
  join public.events e on e.id = t.event_id
  where t.event_id = any(event_ids)
    and t.status in ('active', 'used')
    and (e.status = 'published' or public.is_admin())
  group by t.event_id;
$$;

revoke execute on function public.get_event_booked_counts(uuid[]) from public;
grant execute on function public.get_event_booked_counts(uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- book_ticket: the only way to create a ticket.
-- ---------------------------------------------------------------------------
create or replace function public.book_ticket(p_event_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.events%rowtype;
  v_taken integer;
  v_mine integer;
  v_ticket public.tickets%rowtype;
begin
  if v_user_id is null then
    raise exception 'Please sign in to book tickets.' using errcode = '28000';
  end if;

  -- Lock the event row so concurrent bookings are counted one at a time.
  select * into v_event from public.events where id = p_event_id for update;

  if not found or v_event.status <> 'published' then
    raise exception 'This event is not available for booking.' using errcode = 'P0002';
  end if;

  if v_event.starts_at <= now() then
    raise exception 'This event has already started.' using errcode = 'P0001';
  end if;

  if v_event.capacity is not null then
    select count(*) into v_taken
    from public.tickets
    where event_id = p_event_id and status in ('active', 'used');

    if v_taken >= v_event.capacity then
      raise exception 'This event is sold out.' using errcode = 'P0001';
    end if;
  end if;

  select count(*) into v_mine
  from public.tickets
  where event_id = p_event_id and user_id = v_user_id and status in ('active', 'used');

  if v_mine >= v_event.max_tickets_per_user then
    raise exception 'You can book at most % tickets for this event.', v_event.max_tickets_per_user
      using errcode = 'P0001';
  end if;

  -- 12-character random code; retry on the (very unlikely) collision.
  for attempt in 1..5 loop
    begin
      insert into public.tickets (event_id, user_id, code)
      values (
        p_event_id,
        v_user_id,
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
      )
      returning * into v_ticket;
      exit;
    exception when unique_violation then
      if attempt = 5 then
        raise;
      end if;
    end;
  end loop;

  insert into public.notifications (user_id, title, body, link, created_by)
  values (
    v_user_id,
    'Booking confirmed',
    format('Your ticket for %s is ready.', v_event.title),
    '/tickets/' || v_ticket.code,
    v_user_id
  );

  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_my_ticket: holders cancel their own ticket before the event starts.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_my_ticket(p_ticket_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_ticket public.tickets%rowtype;
  v_starts_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;

  select * into v_ticket
  from public.tickets
  where id = p_ticket_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Ticket not found.' using errcode = 'P0002';
  end if;

  if v_ticket.status <> 'active' then
    raise exception 'Only active tickets can be cancelled.' using errcode = 'P0001';
  end if;

  select starts_at into v_starts_at from public.events where id = v_ticket.event_id;

  if v_starts_at <= now() then
    raise exception 'Tickets can''t be cancelled after the event has started.' using errcode = 'P0001';
  end if;

  update public.tickets
  set status = 'cancelled', cancelled_at = timezone('utc', now())
  where id = v_ticket.id
  returning * into v_ticket;

  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_cancel_ticket: admins cancel any active ticket; the holder is notified.
-- ---------------------------------------------------------------------------
create or replace function public.admin_cancel_ticket(p_ticket_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets%rowtype;
  v_title text;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;

  if not found then
    raise exception 'Ticket not found.' using errcode = 'P0002';
  end if;

  if v_ticket.status <> 'active' then
    raise exception 'Only active tickets can be cancelled.' using errcode = 'P0001';
  end if;

  update public.tickets
  set status = 'cancelled', cancelled_at = timezone('utc', now())
  where id = v_ticket.id
  returning * into v_ticket;

  select title into v_title from public.events where id = v_ticket.event_id;

  insert into public.notifications (user_id, title, body, link)
  values (
    v_ticket.user_id,
    'Ticket cancelled',
    format('Your ticket for %s was cancelled by the organiser.', v_title),
    '/tickets/' || v_ticket.code
  );

  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- check_in_ticket: staff/admin scan a code at the door.
-- result: valid | already_used | cancelled | wrong_date | not_found
-- Check-in opens 6 hours before the start and closes at end_at
-- (or 12 hours after the start when no end time is set).
-- ---------------------------------------------------------------------------
create or replace function public.check_in_ticket(p_code text)
returns table (
  result text,
  ticket_id uuid,
  code text,
  status text,
  event_id uuid,
  event_title text,
  starts_at timestamptz,
  holder_name text,
  checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_code text;
  v_ticket public.tickets%rowtype;
  v_event public.events%rowtype;
  v_holder text;
  v_result text;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Only staff can check in tickets.' using errcode = '42501';
  end if;

  -- Accept the raw code or the QR payload "ETICKET-<code>".
  v_code := upper(regexp_replace(trim(coalesce(p_code, '')), '^ETICKET-', '', 'i'));

  select * into v_ticket from public.tickets t where t.code = v_code for update;

  if not found then
    return query select 'not_found'::text, null::uuid, v_code, null::text, null::uuid,
      null::text, null::timestamptz, null::text, null::timestamptz;
    return;
  end if;

  select * into v_event from public.events e where e.id = v_ticket.event_id;

  select coalesce(nullif(trim(p.full_name), ''), p.email, 'Guest') into v_holder
  from public.profiles p
  where p.id = v_ticket.user_id;

  if v_ticket.status = 'used' then
    v_result := 'already_used';
  elsif v_ticket.status = 'cancelled' or v_event.status = 'cancelled' then
    v_result := 'cancelled';
  elsif now() < v_event.starts_at - interval '6 hours'
     or now() > coalesce(v_event.end_at, v_event.starts_at + interval '12 hours') then
    v_result := 'wrong_date';
  else
    update public.tickets t
    set status = 'used',
        checked_in_at = timezone('utc', now()),
        checked_in_by = auth.uid()
    where t.id = v_ticket.id
    returning * into v_ticket;
    v_result := 'valid';
  end if;

  return query select v_result, v_ticket.id, v_ticket.code, v_ticket.status, v_event.id,
    v_event.title, v_event.starts_at, v_holder, v_ticket.checked_in_at;
end;
$$;

revoke execute on function public.book_ticket(uuid) from public, anon;
revoke execute on function public.cancel_my_ticket(uuid) from public, anon;
revoke execute on function public.admin_cancel_ticket(uuid) from public, anon;
revoke execute on function public.check_in_ticket(text) from public, anon;
grant execute on function public.book_ticket(uuid) to authenticated;
grant execute on function public.cancel_my_ticket(uuid) to authenticated;
grant execute on function public.admin_cancel_ticket(uuid) to authenticated;
grant execute on function public.check_in_ticket(text) to authenticated;
