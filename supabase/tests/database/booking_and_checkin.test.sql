-- Tests for book_ticket, cancel_my_ticket and check_in_ticket (pgTAP).
-- Organizer/review workflow tests: platform_workflow.test.sql
--
-- How to run:
--   * Supabase dashboard: paste this whole file into the SQL Editor and run it.
--     The result table lists every test as "ok N - ..." or "not ok N - ...".
--   * Supabase CLI (local stack): `supabase test db`
--
-- Safe on a real project: runtests() runs each test in its own transaction
-- and rolls it back, so fixtures (users, events, tickets) never persist.
-- Helpers live in pg_temp and disappear when the session ends. The only
-- lasting change is enabling the pgtap extension.
-- Not covered here: true concurrency (two sessions booking the last seat at
-- once). book_ticket handles that by locking the event row (SELECT ... FOR UPDATE).

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Fixture ids
create or replace function pg_temp.uid(name text) returns uuid language sql immutable as $$
  select case name
    when 'alice' then '00000000-0000-4000-8000-00000000a11c'
    when 'bob'   then '00000000-0000-4000-8000-000000000b0b'
    when 'cara'  then '00000000-0000-4000-8000-00000000ca7a'
    when 'admin' then '00000000-0000-4000-8000-00000000057a'
  end::uuid;
$$;

create or replace function pg_temp.eid(name text) returns uuid language sql immutable as $$
  select case name
    when 'small'  then '00000000-0000-4000-9000-000000000001' -- capacity 2, 1 per person, in 2 days
    when 'today'  then '00000000-0000-4000-9000-000000000002' -- starts in 1 hour (check-in open)
    when 'past'   then '00000000-0000-4000-9000-000000000003' -- started 1 hour ago
    when 'draft'  then '00000000-0000-4000-9000-000000000004' -- not published
  end::uuid;
$$;

create or replace function pg_temp.fixtures() returns void language plpgsql as $$
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (pg_temp.uid('alice'), 'alice@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Alice Test"}'),
    (pg_temp.uid('bob'),   'bob@test.invalid',   'authenticated', 'authenticated', '{"full_name":"Bob Test"}'),
    (pg_temp.uid('cara'),  'cara@test.invalid',  'authenticated', 'authenticated', '{"full_name":"Cara Test"}'),
    (pg_temp.uid('admin'), 'admin@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Door Admin"}');
  -- No signed-in user here, so the role guard allows this.
  -- Admins must be on the authorized email list.
  insert into public.admin_emails (email) values ('admin@test.invalid') on conflict do nothing;
  update public.profiles set role = 'admin' where id = pg_temp.uid('admin');

  insert into public.events (id, title, slug, starts_at, location, status, capacity, max_tickets_per_user) values
    (pg_temp.eid('small'), 'Small Gig',   'test-small-gig',   now() + interval '2 days',  'Hall', 'published', 2, 1),
    (pg_temp.eid('today'), 'Tonight',     'test-tonight',     now() + interval '1 hour',  'Hall', 'published', null, 4),
    (pg_temp.eid('past'),  'Yesterday',   'test-yesterday',   now() - interval '1 hour',  'Hall', 'published', null, 4),
    (pg_temp.eid('draft'), 'Coming Soon', 'test-coming-soon', now() + interval '10 days', 'Hall', 'draft',     null, 4);

  -- Capacity now lives on ticket types.
  insert into public.ticket_types (event_id, name, price, quantity)
  select e.id, 'General Admission', 0, e.capacity
  from public.events e
  where e.id in (pg_temp.eid('small'), pg_temp.eid('today'), pg_temp.eid('past'), pg_temp.eid('draft'));
end;
$$;

-- Switch to a signed-in user (or anonymous when p_user is null) until reset.
create or replace function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  if p_user is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
  else
    perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
  end if;
end;
$$;

-- Book as a user. Returns 'ok:<code>' or the error message.
create or replace function pg_temp.try_book(p_user uuid, p_event uuid) returns text language plpgsql as $$
declare
  v_ticket public.tickets%rowtype;
  v_result text;
  -- Looked up before switching user: attendees can't even see a draft's ticket types.
  v_type uuid := (select t.id from public.ticket_types t where t.event_id = p_event order by t.sort_order limit 1);
begin
  perform pg_temp.act_as(p_user);
  begin
    select * into v_ticket from public.book_ticket(v_type, 1);
    v_result := 'ok:' || v_ticket.code;
  exception when others then
    v_result := sqlerrm;
  end;
  execute 'reset role';
  return v_result;
end;
$$;

-- Cancel own ticket as a user. Returns 'ok' or the error message.
create or replace function pg_temp.try_cancel(p_user uuid, p_ticket uuid) returns text language plpgsql as $$
declare
  v_result text := 'ok';
begin
  perform pg_temp.act_as(p_user);
  begin
    perform public.cancel_my_ticket(p_ticket);
  exception when others then
    v_result := sqlerrm;
  end;
  execute 'reset role';
  return v_result;
end;
$$;

-- Check in as a user. Returns '<result>|<holder>' or the error message.
create or replace function pg_temp.try_check_in(p_user uuid, p_code text, p_event uuid default null) returns text language plpgsql as $$
declare
  v_row record;
  v_result text;
begin
  perform pg_temp.act_as(p_user);
  begin
    select * into v_row from public.check_in_ticket(p_code, p_event);
    v_result := v_row.result || '|' || coalesce(v_row.holder_name, '');
  exception when others then
    v_result := sqlerrm;
  end;
  execute 'reset role';
  return v_result;
end;
$$;

create or replace function pg_temp.code_of(booking text) returns text language sql immutable as $$
  select substr(booking, 4);
$$;

-- ---------------------------------------------------------------------------
-- Booking
-- ---------------------------------------------------------------------------

create or replace function pg_temp.test_01_booking_requires_sign_in() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  -- Signed-out visitors can't call the function at all (EXECUTE is revoked from anon).
  return next is(pg_temp.try_book(null, pg_temp.eid('today')),
    'permission denied for function book_ticket', 'anonymous visitors cannot book');
end;
$$;

create or replace function pg_temp.test_02_booking_creates_ticket_and_notification() returns setof text language plpgsql as $$
declare
  v_booking text;
begin
  perform pg_temp.fixtures();
  v_booking := pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('today'));
  return next matches(v_booking, '^ok:[0-9A-F]{12}$', 'booking returns a 12-character code');
  return next is(
    (select status from public.tickets where code = pg_temp.code_of(v_booking)),
    'active', 'new ticket is active');
  return next is(
    (select count(*)::int from public.notifications
      where user_id = pg_temp.uid('alice') and title = 'Booking confirmed'
        and link = '/tickets/' || pg_temp.code_of(v_booking)),
    1, 'a "Booking confirmed" notification links to the ticket');
end;
$$;

create or replace function pg_temp.test_03_capacity_is_enforced() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next matches(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('small')), '^ok:', 'seat 1 of 2 booked');
  return next matches(pg_temp.try_book(pg_temp.uid('bob'), pg_temp.eid('small')), '^ok:', 'seat 2 of 2 booked');
  return next is(pg_temp.try_book(pg_temp.uid('cara'), pg_temp.eid('small')),
    'General Admission is sold out.', 'third booking is refused when sold out');
end;
$$;

create or replace function pg_temp.test_04_per_person_limit() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next matches(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('small')), '^ok:', 'first ticket booked');
  return next is(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('small')),
    'You can book at most 1 tickets for this event.', 'second ticket over the per-person limit is refused');
end;
$$;

create or replace function pg_temp.test_05_past_and_draft_events() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next is(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('past')),
    'This event has already started.', 'events that have started cannot be booked');
  return next is(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('draft')),
    'This event is not available for booking.', 'draft events cannot be booked');
end;
$$;

create or replace function pg_temp.test_06_cancelling_frees_a_seat() returns setof text language plpgsql as $$
declare
  v_booking text;
begin
  perform pg_temp.fixtures();
  v_booking := pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('small'));
  perform pg_temp.try_book(pg_temp.uid('bob'), pg_temp.eid('small'));
  return next is(
    pg_temp.try_cancel(pg_temp.uid('alice'), (select id from public.tickets where code = pg_temp.code_of(v_booking))),
    'ok', 'holder cancels their own ticket');
  return next matches(pg_temp.try_book(pg_temp.uid('cara'), pg_temp.eid('small')), '^ok:',
    'the released seat can be booked again');
end;
$$;

create or replace function pg_temp.test_07_cancel_rules() returns setof text language plpgsql as $$
declare
  v_booking text;
  v_ticket uuid;
begin
  perform pg_temp.fixtures();
  -- Book first, then look the ticket up (try_book must run exactly once).
  v_booking := pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('today'));
  v_ticket := (select id from public.tickets where code = pg_temp.code_of(v_booking));
  return next is(pg_temp.try_cancel(pg_temp.uid('bob'), v_ticket),
    'Ticket not found.', 'nobody can cancel someone else''s ticket');
  update public.events set starts_at = now() - interval '5 minutes' where id = pg_temp.eid('today');
  return next is(pg_temp.try_cancel(pg_temp.uid('alice'), v_ticket),
    'Tickets can''t be cancelled after the event has started.', 'no cancelling after the start');
end;
$$;

create or replace function pg_temp.test_08_no_direct_ticket_writes() returns setof text language plpgsql as $$
declare
  v_error text := 'no error';
begin
  perform pg_temp.fixtures();
  perform pg_temp.act_as(pg_temp.uid('alice'));
  begin
    insert into public.tickets (event_id) values (pg_temp.eid('today'));
  exception when others then
    v_error := sqlerrm;
  end;
  execute 'reset role';
  return next is(v_error, 'permission denied for table tickets', 'tickets cannot be inserted directly');
end;
$$;

-- ---------------------------------------------------------------------------
-- Check-in
-- ---------------------------------------------------------------------------

create or replace function pg_temp.test_09_check_in_requires_admin() returns setof text language plpgsql as $$
declare
  v_code text;
begin
  perform pg_temp.fixtures();
  v_code := pg_temp.code_of(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('today')));
  return next is(pg_temp.try_check_in(pg_temp.uid('bob'), v_code, pg_temp.eid('today')),
    'You can''t check in tickets for this event.', 'regular users cannot check tickets in');
  return next is(pg_temp.try_check_in(pg_temp.uid('bob'), v_code),
    'Choose the event you are checking in for.', 'only admins may scan without choosing an event');
end;
$$;

create or replace function pg_temp.test_10_check_in_once_only() returns setof text language plpgsql as $$
declare
  v_code text;
begin
  perform pg_temp.fixtures();
  v_code := pg_temp.code_of(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('today')));
  return next is(pg_temp.try_check_in(pg_temp.uid('admin'), v_code),
    'valid|Alice Test', 'first scan is valid and shows the holder');
  return next is(
    (select status from public.tickets where code = v_code), 'used', 'ticket is marked used');
  return next is(pg_temp.try_check_in(pg_temp.uid('admin'), v_code),
    'already_used|Alice Test', 'second scan of the same ticket is rejected');
end;
$$;

create or replace function pg_temp.test_11_check_in_accepts_qr_payload() returns setof text language plpgsql as $$
declare
  v_code text;
begin
  perform pg_temp.fixtures();
  v_code := pg_temp.code_of(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('today')));
  return next is(pg_temp.try_check_in(pg_temp.uid('admin'), 'eticket-' || lower(v_code)),
    'valid|Alice Test', 'QR payload "ETICKET-<code>" works, any letter case');
end;
$$;

create or replace function pg_temp.test_12_check_in_rejections() returns setof text language plpgsql as $$
declare
  v_future text;
  v_cancelled text;
begin
  perform pg_temp.fixtures();
  return next is(pg_temp.try_check_in(pg_temp.uid('admin'), 'NOTAREALCODE'),
    'not_found|', 'unknown codes are invalid');

  v_future := pg_temp.code_of(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('small')));
  return next is(pg_temp.try_check_in(pg_temp.uid('admin'), v_future),
    'wrong_date|Alice Test', 'tickets for another day are rejected');
  return next is(
    (select status from public.tickets where code = v_future), 'active', 'a wrong-date scan leaves the ticket active');

  v_cancelled := pg_temp.code_of(pg_temp.try_book(pg_temp.uid('bob'), pg_temp.eid('today')));
  update public.tickets set status = 'cancelled' where code = v_cancelled;
  return next is(pg_temp.try_check_in(pg_temp.uid('admin'), v_cancelled),
    'cancelled|Bob Test', 'cancelled tickets are rejected');
end;
$$;

-- ---------------------------------------------------------------------------
-- Run everything (each test is rolled back afterwards).
-- ---------------------------------------------------------------------------
select * from runtests(pg_my_temp_schema()::regnamespace::name, '^test_');
