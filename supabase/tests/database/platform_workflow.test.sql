-- Tests for the three-sided platform rules (pgTAP): roles, organizer
-- applications, event ownership and review, live edits, ticket types,
-- door staff, attendee access, cancellation, audit log, completion and the
-- Event Manager dashboard helpers.
--
-- Run like booking_and_checkin.test.sql: paste into the Supabase SQL Editor,
-- or `supabase test db`. Every test is rolled back; nothing persists.

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function pg_temp.uid(name text) returns uuid language sql immutable as $$
  select case name
    when 'admin' then '10000000-0000-4000-8000-000000000001'
    when 'alice' then '10000000-0000-4000-8000-000000000002' -- attendee
    when 'olga'  then '10000000-0000-4000-8000-000000000003' -- applies to be an organizer
    when 'oscar' then '10000000-0000-4000-8000-000000000004' -- approved organizer
    when 'otto'  then '10000000-0000-4000-8000-000000000005' -- another approved organizer
    when 'dora'  then '10000000-0000-4000-8000-000000000006' -- door staff (attendee)
  end::uuid;
$$;

create or replace function pg_temp.eid(name text) returns uuid language sql immutable as $$
  select case name
    when 'draft' then '20000000-0000-4000-9000-000000000001' -- oscar's draft
    when 'live'  then '20000000-0000-4000-9000-000000000002' -- oscar's published event, starts in 1h
    when 'other' then '20000000-0000-4000-9000-000000000003' -- otto's published event
  end::uuid;
$$;

create or replace function pg_temp.tid(name text) returns uuid language sql immutable as $$
  select case name
    when 'draft_ga' then '30000000-0000-4000-9000-000000000001'
    when 'vip'      then '30000000-0000-4000-9000-000000000002' -- 2 seats
    when 'regular'  then '30000000-0000-4000-9000-000000000003' -- unlimited
    when 'other_ga' then '30000000-0000-4000-9000-000000000004'
  end::uuid;
$$;

create or replace function pg_temp.fixtures() returns void language plpgsql as $$
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (pg_temp.uid('admin'), 'admin@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Ada Admin"}'),
    (pg_temp.uid('alice'), 'alice@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Alice Attendee"}'),
    (pg_temp.uid('olga'),  'olga@test.invalid',  'authenticated', 'authenticated', '{"full_name":"Olga Applicant"}'),
    (pg_temp.uid('oscar'), 'oscar@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Oscar Organizer"}'),
    (pg_temp.uid('otto'),  'otto@test.invalid',  'authenticated', 'authenticated', '{"full_name":"Otto Organizer"}'),
    (pg_temp.uid('dora'),  'dora@test.invalid',  'authenticated', 'authenticated', '{"full_name":"Dora Door"}');

  -- Set up as the SQL editor would (no signed-in user, so guards allow it).
  update public.profiles set role = 'admin' where id = pg_temp.uid('admin');
  update public.profiles set role = 'organizer' where id in (pg_temp.uid('oscar'), pg_temp.uid('otto'));
  insert into public.organizer_profiles (user_id, organization_name, status) values
    (pg_temp.uid('oscar'), 'Oscar Events', 'approved'),
    (pg_temp.uid('otto'), 'Otto Live', 'approved');

  insert into public.events (id, title, slug, description, starts_at, location, status, organizer_id, max_tickets_per_user) values
    (pg_temp.eid('draft'), 'Oscar Draft', 'test-oscar-draft', '', now() + interval '10 days', 'Hall', 'draft', pg_temp.uid('oscar'), 4),
    (pg_temp.eid('live'), 'Oscar Live', 'test-oscar-live', 'A live show for the whole family to enjoy.', now() + interval '1 hour', 'Arena', 'published', pg_temp.uid('oscar'), 4),
    (pg_temp.eid('other'), 'Otto Live', 'test-otto-live', 'Otto''s event for everyone in town.', now() + interval '2 hours', 'Park', 'published', pg_temp.uid('otto'), 4);

  insert into public.ticket_types (id, event_id, name, price, quantity, sort_order) values
    (pg_temp.tid('draft_ga'), pg_temp.eid('draft'), 'General Admission', 10, 100, 0),
    (pg_temp.tid('vip'), pg_temp.eid('live'), 'VIP', 100, 2, 0),
    (pg_temp.tid('regular'), pg_temp.eid('live'), 'Regular', 20, null, 1),
    (pg_temp.tid('other_ga'), pg_temp.eid('other'), 'General Admission', 5, 50, 0);
end;
$$;

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

-- Run SQL as a user; returns 'ok' or the error message.
create or replace function pg_temp.run_as(p_user uuid, p_sql text) returns text language plpgsql as $$
declare
  v_result text := 'ok';
begin
  perform pg_temp.act_as(p_user);
  begin
    execute p_sql;
  exception when others then
    v_result := sqlerrm;
  end;
  execute 'reset role';
  return v_result;
end;
$$;

-- Evaluate a scalar query as a user; returns its value as text (or the error).
create or replace function pg_temp.value_as(p_user uuid, p_sql text) returns text language plpgsql as $$
declare
  v_value text;
begin
  perform pg_temp.act_as(p_user);
  begin
    execute p_sql into v_value;
  exception when others then
    v_value := 'ERROR: ' || sqlerrm;
  end;
  execute 'reset role';
  return v_value;
end;
$$;

-- ---------------------------------------------------------------------------
-- Roles and organizer applications
-- ---------------------------------------------------------------------------
create or replace function pg_temp.test_01_roles() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next is((select role from public.profiles where id = pg_temp.uid('alice')), 'attendee',
    'new accounts are attendees');
  return next is(pg_temp.run_as(pg_temp.uid('alice'),
    $q$update public.profiles set role = 'organizer' where id = '10000000-0000-4000-8000-000000000002'$q$),
    'Only admins can change roles.', 'users cannot change their own role');
end;
$$;

create or replace function pg_temp.test_02_apply_as_organizer() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next is(pg_temp.run_as(pg_temp.uid('olga'),
    $q$select public.apply_as_organizer('Olga Productions', '+677 123', 'Honiara', 'https://olga.example', array['Music'], 'We run concerts.')$q$),
    'ok', 'an attendee can apply');
  return next is((select status from public.organizer_profiles where user_id = pg_temp.uid('olga')), 'pending',
    'the application is pending');
  return next is((select count(*)::int from public.notifications
    where user_id = pg_temp.uid('admin') and title = 'New organizer application'), 1, 'admins are notified');
  return next is((select count(*)::int from public.audit_log
    where action = 'organizer.applied' and target_id = pg_temp.uid('olga')::text), 1, 'the application is audited');
  return next is(pg_temp.run_as(pg_temp.uid('olga'),
    $q$insert into public.events (title, slug, starts_at, location) values ('X', 'test-x', now() + interval '1 day', 'Y')$q$),
    'new row violates row-level security policy for table "events"', 'pending organizers cannot create events');
  return next is(pg_temp.run_as(pg_temp.uid('olga'),
    $q$update public.organizer_profiles set status = 'approved' where user_id = '10000000-0000-4000-8000-000000000003'$q$),
    'permission denied for table organizer_profiles', 'applicants cannot approve themselves');
  return next is(pg_temp.value_as(pg_temp.uid('alice'),
    $q$select count(*) from public.organizer_profiles where user_id = '10000000-0000-4000-8000-000000000003'$q$),
    '0', 'other users cannot read an application');
end;
$$;

create or replace function pg_temp.test_03_review_organizer() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  perform pg_temp.run_as(pg_temp.uid('olga'), $q$select public.apply_as_organizer('Olga Productions')$q$);
  return next is(pg_temp.run_as(pg_temp.uid('oscar'),
    $q$select public.review_organizer('10000000-0000-4000-8000-000000000003', 'approve')$q$),
    'Admins only.', 'organizers cannot approve applications');
  return next is(pg_temp.run_as(pg_temp.uid('admin'),
    $q$select public.review_organizer('10000000-0000-4000-8000-000000000003', 'reject')$q$),
    'Give a reason for the rejection.', 'rejections need a reason');
  return next is(pg_temp.run_as(pg_temp.uid('admin'),
    $q$select public.review_organizer('10000000-0000-4000-8000-000000000003', 'approve')$q$),
    'ok', 'admins approve');
  return next is((select role from public.profiles where id = pg_temp.uid('olga')), 'organizer',
    'approval makes the user an organizer');
  return next is((select count(*)::int from public.notifications
    where user_id = pg_temp.uid('olga') and title = 'Your organizer account is approved'), 1, 'the applicant is notified');
  return next is(pg_temp.run_as(pg_temp.uid('admin'),
    $q$select public.review_organizer('10000000-0000-4000-8000-000000000003', 'suspend', 'Too many complaints')$q$),
    'ok', 'admins suspend');
  return next is(pg_temp.run_as(pg_temp.uid('olga'),
    $q$insert into public.events (title, slug, starts_at, location) values ('X', 'test-x', now() + interval '1 day', 'Y')$q$),
    'new row violates row-level security policy for table "events"', 'suspended organizers cannot create events');
  return next is(
    (select count(*)::int from public.get_public_organizers(array[pg_temp.uid('oscar'), pg_temp.uid('alice')])),
    1, 'only organizer profiles are public');
end;
$$;

-- ---------------------------------------------------------------------------
-- Event ownership and review workflow
-- ---------------------------------------------------------------------------
create or replace function pg_temp.test_04_organizer_drafts() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next is(pg_temp.run_as(pg_temp.uid('oscar'),
    $q$insert into public.events (id, title, slug, starts_at, location, status, is_featured)
       values ('20000000-0000-4000-9000-0000000000aa', 'Sneaky', 'test-sneaky', now() + interval '5 days', 'Hall', 'published', true)$q$),
    'ok', 'an approved organizer creates an event');
  return next is((select status || '|' || organizer_id::text || '|' || is_featured::text
    from public.events where id = '20000000-0000-4000-9000-0000000000aa'),
    'draft|' || pg_temp.uid('oscar')::text || '|false', 'it is forced to an unfeatured draft they own');
  return next is(pg_temp.run_as(pg_temp.uid('oscar'),
    $q$update public.events set status = 'published' where id = '20000000-0000-4000-9000-000000000001'$q$),
    'This field can only be changed through the event review actions.', 'organizers cannot publish directly');
  return next is(pg_temp.value_as(pg_temp.uid('otto'),
    $q$with u as (update public.events set title = 'Hijacked' where id = '20000000-0000-4000-9000-000000000001' returning 1) select count(*) from u$q$),
    '0', 'organizers cannot edit someone else''s event');
  return next is(pg_temp.value_as(pg_temp.uid('alice'),
    $q$select count(*) from public.events where id = '20000000-0000-4000-9000-000000000001'$q$),
    '0', 'attendees cannot see drafts');
  return next is(pg_temp.value_as(null,
    $q$select count(*) from public.events where id in ('20000000-0000-4000-9000-000000000001', '20000000-0000-4000-9000-000000000002')$q$),
    '1', 'anonymous visitors see only published events');
end;
$$;

create or replace function pg_temp.test_05_submit_and_review() returns setof text language plpgsql as $$
declare
  v_draft constant text := '20000000-0000-4000-9000-000000000001';
begin
  perform pg_temp.fixtures();
  return next matches(pg_temp.run_as(pg_temp.uid('oscar'), format('select public.submit_event_for_review(%L)', v_draft)),
    '^Before submitting: add a description', 'submission validates required fields');

  perform pg_temp.run_as(pg_temp.uid('oscar'),
    format($q$update public.events set description = 'An evening of music under the stars.' where id = %L$q$, v_draft));
  return next is(pg_temp.run_as(pg_temp.uid('oscar'), format('select public.submit_event_for_review(%L)', v_draft)),
    'ok', 'a complete draft can be submitted');
  return next is((select status from public.events where id = v_draft::uuid), 'pending_review', 'it is pending review');
  return next is((select count(*)::int from public.notifications
    where user_id = pg_temp.uid('admin') and title = 'Event submitted for review'), 1, 'admins are notified');
  return next is(pg_temp.value_as(pg_temp.uid('oscar'),
    format($q$with u as (update public.events set title = 'Changed' where id = %L returning 1) select count(*) from u$q$, v_draft)),
    '0', 'events in review are locked for the organizer');

  return next is(pg_temp.run_as(pg_temp.uid('admin'), format($q$select public.review_event(%L, 'request_changes')$q$, v_draft)),
    'Add a note for the organizer.', 'requesting changes needs a note');
  return next is(pg_temp.run_as(pg_temp.uid('admin'),
    format($q$select public.review_event(%L, 'request_changes', 'Please add the venue address.')$q$, v_draft)),
    'ok', 'admins request changes');
  return next is((select body from public.notifications
    where user_id = pg_temp.uid('oscar') and title = 'Changes requested for Oscar Draft'),
    'Please add the venue address.', 'the organizer gets the note');
  return next is(pg_temp.run_as(pg_temp.uid('oscar'),
    format($q$update public.events set location = 'Hall, 1 Main Street' where id = %L$q$, v_draft)),
    'ok', 'the organizer can edit again');
  perform pg_temp.run_as(pg_temp.uid('oscar'), format('select public.submit_event_for_review(%L)', v_draft));
  return next is(pg_temp.run_as(pg_temp.uid('admin'), format($q$select public.review_event(%L, 'approve')$q$, v_draft)),
    'ok', 'admins approve');
  return next is((select status from public.events where id = v_draft::uuid), 'published', 'the event is live');
  return next is((select count(*)::int from public.audit_log where target_id = v_draft and action like 'event.%'),
    4, 'submit, request changes, resubmit and approve are audited');
end;
$$;

create or replace function pg_temp.test_06_update_published_event() returns setof text language plpgsql as $$
declare
  v_live constant text := '20000000-0000-4000-9000-000000000002';
begin
  perform pg_temp.fixtures();
  return next is(pg_temp.value_as(pg_temp.uid('oscar'),
    format($q$select (public.update_published_event(%L, '{"description": "Now with fireworks at the end of the night!"}'::jsonb))->>'requires_review'$q$, v_live)),
    'false', 'description changes stay live');
  return next is((select status from public.events where id = v_live::uuid), 'published', 'still published');
  return next is(pg_temp.value_as(pg_temp.uid('oscar'),
    format($q$select (public.update_published_event(%L, jsonb_build_object('ticket_types', jsonb_build_array(jsonb_build_object('id', %L, 'quantity', 10)))))->>'requires_review'$q$,
      v_live, pg_temp.tid('vip'))),
    'false', 'raising a quantity stays live');
  return next is(pg_temp.value_as(pg_temp.uid('oscar'),
    format($q$select (public.update_published_event(%L, jsonb_build_object('ticket_types', jsonb_build_array(jsonb_build_object('id', %L, 'price', 150)))))->>'requires_review'$q$,
      v_live, pg_temp.tid('vip'))),
    'true', 'a price change needs review');
  return next is((select status from public.events where id = v_live::uuid), 'pending_review', 'the event goes back to review');
  return next is(pg_temp.value_as(pg_temp.uid('otto'),
    format($q$select public.update_published_event(%L, '{"description": "x"}'::jsonb)$q$, v_live)),
    'ERROR: Event not found.', 'other organizers cannot edit it');
end;
$$;

-- ---------------------------------------------------------------------------
-- Ticket types and booking
-- ---------------------------------------------------------------------------
create or replace function pg_temp.test_07_ticket_types() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next is(pg_temp.value_as(pg_temp.uid('alice'),
    format('select count(*) from public.book_ticket(%L, 2)', pg_temp.tid('vip'))),
    '2', 'two VIP tickets in one booking');
  return next is(pg_temp.value_as(pg_temp.uid('dora'),
    format('select count(*) from public.book_ticket(%L, 1)', pg_temp.tid('vip'))),
    'ERROR: VIP is sold out.', 'capacity is per ticket type');
  return next is(pg_temp.value_as(pg_temp.uid('dora'),
    format('select count(*) from public.book_ticket(%L, 1)', pg_temp.tid('regular'))),
    '1', 'other types can still be booked');
  return next is(pg_temp.value_as(pg_temp.uid('alice'),
    format('select count(*) from public.book_ticket(%L, 3)', pg_temp.tid('regular'))),
    'ERROR: You can book 2 more ticket(s) for this event.', 'the per-person limit spans all types');
  return next is((select price::text || '|' || coalesce(capacity::text, 'unlimited') from public.events where id = pg_temp.eid('live')),
    '20.00|unlimited', 'event price/capacity summarise its ticket types');
  return next is(pg_temp.run_as(pg_temp.uid('admin'),
    format('update public.ticket_types set quantity = 1 where id = %L', pg_temp.tid('vip'))),
    'Quantity for "VIP" can''t be lower than the 2 tickets already sold.', 'quantities can''t drop below sales');
  return next is((select count(*)::int from public.notifications
    where user_id = pg_temp.uid('alice') and body like '2 × VIP for Oscar Live%'), 1, 'one confirmation per booking');
end;
$$;

-- ---------------------------------------------------------------------------
-- Door staff, check-in and attendee access
-- ---------------------------------------------------------------------------
create or replace function pg_temp.test_08_staff_and_check_in() returns setof text language plpgsql as $$
declare
  v_code text;
  v_other_code text;
  v_live constant text := '20000000-0000-4000-9000-000000000002';
begin
  perform pg_temp.fixtures();
  v_code := pg_temp.value_as(pg_temp.uid('alice'), format('select code from public.book_ticket(%L, 1)', pg_temp.tid('regular')));
  v_other_code := pg_temp.value_as(pg_temp.uid('alice'), format('select code from public.book_ticket(%L, 1)', pg_temp.tid('other_ga')));

  return next is(pg_temp.value_as(pg_temp.uid('dora'), format($q$select result from public.check_in_ticket(%L, %L)$q$, v_code, v_live)),
    'ERROR: You can''t check in tickets for this event.', 'people without a role cannot check in');
  return next is(pg_temp.value_as(pg_temp.uid('otto'), format($q$select public.add_event_staff(%L, 'dora@test.invalid')$q$, v_live)),
    'ERROR: Only the event organizer can add door staff.', 'only the organizer adds staff');
  return next is(pg_temp.value_as(pg_temp.uid('oscar'), format($q$select public.add_event_staff(%L, 'nobody@test.invalid')$q$, v_live)),
    'no_account', 'unknown emails are reported');
  return next is(pg_temp.value_as(pg_temp.uid('oscar'), format($q$select public.add_event_staff(%L, 'DORA@test.invalid')$q$, v_live)),
    'added', 'the organizer adds door staff by email');
  return next is(pg_temp.value_as(pg_temp.uid('dora'), format($q$select result || '|' || ticket_type_name || '|' || holder_name from public.check_in_ticket(%L, %L)$q$, v_code, v_live)),
    'valid|Regular|Alice Attendee', 'door staff check guests in');
  return next is(pg_temp.value_as(pg_temp.uid('oscar'), format($q$select result from public.check_in_ticket(%L, %L)$q$, v_code, v_live)),
    'already_used', 'a second scan is rejected');
  return next is(pg_temp.value_as(pg_temp.uid('dora'), format($q$select result || '|' || coalesce(holder_name, '-') from public.check_in_ticket(%L, %L)$q$, v_other_code, v_live)),
    'wrong_event|-', 'tickets for another event are rejected without details');
  return next is(pg_temp.value_as(pg_temp.uid('dora'), format($q$select result from public.check_in_ticket(%L, %L)$q$, v_other_code, pg_temp.eid('other'))),
    'ERROR: You can''t check in tickets for this event.', 'staff only work their own event');
end;
$$;

create or replace function pg_temp.test_09_attendee_visibility() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  perform pg_temp.value_as(pg_temp.uid('alice'), format('select code from public.book_ticket(%L, 1)', pg_temp.tid('regular')));
  perform pg_temp.value_as(pg_temp.uid('dora'), format('select code from public.book_ticket(%L, 1)', pg_temp.tid('other_ga')));

  return next is(pg_temp.value_as(pg_temp.uid('oscar'),
    format('select string_agg(holder_email, %L) from public.list_event_attendees(%L)', ',', pg_temp.eid('live'))),
    'alice@test.invalid', 'organizers see their attendees with email');
  return next is(pg_temp.value_as(pg_temp.uid('oscar'),
    format('select count(*) from public.list_event_attendees(%L)', pg_temp.eid('other'))),
    'ERROR: Only the event organizer can see attendees.', 'but not other organizers'' attendees');
  return next is(pg_temp.value_as(pg_temp.uid('oscar'), 'select count(*) from public.tickets'),
    '1', 'organizers read tickets for their own events only');
  return next is(pg_temp.value_as(pg_temp.uid('alice'), 'select count(*) from public.tickets'),
    '1', 'attendees read only their own tickets');
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancellation, audit log, completion
-- ---------------------------------------------------------------------------
create or replace function pg_temp.test_10_cancellation() returns setof text language plpgsql as $$
declare
  v_live constant text := '20000000-0000-4000-9000-000000000002';
begin
  perform pg_temp.fixtures();
  perform pg_temp.value_as(pg_temp.uid('alice'), format('select code from public.book_ticket(%L, 1)', pg_temp.tid('regular')));

  return next is(pg_temp.run_as(pg_temp.uid('otto'), format($q$select public.request_event_cancellation(%L, 'x')$q$, v_live)),
    'Event not found.', 'only the owner can request cancellation');
  return next is(pg_temp.run_as(pg_temp.uid('oscar'), format($q$select public.request_event_cancellation(%L, 'Venue flooded')$q$, v_live)),
    'ok', 'the owner requests cancellation');
  return next is((select cancellation_requested from public.events where id = v_live::uuid), true, 'the request is recorded');
  return next is(pg_temp.run_as(pg_temp.uid('oscar'), format($q$select public.cancel_event(%L, 'x')$q$, v_live)),
    'Admins only.', 'organizers cannot cancel directly');
  return next is(pg_temp.value_as(pg_temp.uid('admin'), format($q$select public.cancel_event(%L, 'Refunds within 5 days.')$q$, v_live)),
    '1', 'admins cancel; one active ticket cancelled');
  return next is((select body from public.notifications where user_id = pg_temp.uid('alice') and title = 'Event cancelled'),
    'Oscar Live has been cancelled. Refunds within 5 days.', 'ticket holders are told why');
end;
$$;

create or replace function pg_temp.test_11_audit_log_and_completion() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  perform pg_temp.run_as(pg_temp.uid('olga'), $q$select public.apply_as_organizer('Olga Productions')$q$);
  return next is(pg_temp.value_as(pg_temp.uid('oscar'), 'select count(*) from public.audit_log'),
    '0', 'non-admins cannot read the audit log');
  return next ok(pg_temp.value_as(pg_temp.uid('admin'), 'select count(*) from public.audit_log')::int >= 1,
    'admins can read the audit log');
  return next is(pg_temp.run_as(pg_temp.uid('admin'), $q$insert into public.audit_log (action, target_type) values ('fake', 'x')$q$),
    'permission denied for table audit_log', 'nobody writes the audit log directly');

  update public.events set starts_at = now() - interval '8 hours' where id = pg_temp.eid('other');
  return next ok(public.complete_past_events() >= 1, 'ended events are completed');
  return next is((select status from public.events where id = pg_temp.eid('other')), 'completed', 'status is completed');
  return next is(pg_temp.value_as(null, format('select count(*) from public.events where id = %L', pg_temp.eid('other'))),
    '1', 'completed events stay publicly visible');
end;
$$;

-- ---------------------------------------------------------------------------
-- Event Manager dashboard helpers
-- ---------------------------------------------------------------------------
create or replace function pg_temp.test_12_manager_dashboard() returns setof text language plpgsql as $$
declare
  v_code text;
  v_live constant text := '20000000-0000-4000-9000-000000000002';
begin
  perform pg_temp.fixtures();
  v_code := pg_temp.value_as(pg_temp.uid('alice'), format('select code from public.book_ticket(%L, 2)', pg_temp.tid('regular')));
  perform pg_temp.value_as(pg_temp.uid('oscar'), format($q$select public.add_event_staff(%L, 'dora@test.invalid')$q$, v_live));

  -- Organizer profile edits
  return next is(pg_temp.value_as(pg_temp.uid('oscar'),
    $q$select organization_name || '|' || status from public.update_organizer_profile('Oscar Live Events', '+677 1', 'Honiara', 'https://oscar.test', array['Music'], 'We run shows.', null)$q$),
    'Oscar Live Events|approved', 'approved organizers edit their public profile');
  return next is(pg_temp.value_as(pg_temp.uid('alice'),
    $q$select organization_name from public.update_organizer_profile('Alice Co')$q$),
    'ERROR: Only approved organizers can edit their organizer profile here.', 'others cannot use the organizer profile editor');
  return next is(pg_temp.value_as(pg_temp.uid('oscar'),
    format($q$select organization_name from public.update_organizer_profile('Oscar', null, null, null, '{}', null, %L)$q$, pg_temp.uid('otto') || '/logo.png')),
    'ERROR: Upload the logo to your own folder.', 'logos must be in the organizer''s own folder');

  -- Door staff list
  return next is(pg_temp.value_as(pg_temp.uid('oscar'), format('select string_agg(full_name || %L || email, %L) from public.list_event_staff(%L)', '|', ',', v_live)),
    'Dora Door|dora@test.invalid', 'the organizer sees their door staff');
  return next is(pg_temp.value_as(pg_temp.uid('otto'), format('select count(*) from public.list_event_staff(%L)', v_live)),
    'ERROR: Only the event organizer can see door staff.', 'other organizers cannot');

  -- Check-in progress
  perform pg_temp.value_as(pg_temp.uid('dora'), format('select result from public.check_in_ticket(%L, %L)', v_code, v_live));
  return next is(pg_temp.value_as(pg_temp.uid('dora'), format($q$select checked_in || '/' || total from public.get_check_in_progress(%L)$q$, v_live)),
    '1/2', 'door staff see check-in progress');
  return next is(pg_temp.value_as(pg_temp.uid('alice'), format($q$select checked_in || '/' || total from public.get_check_in_progress(%L)$q$, v_live)),
    'ERROR: You can''t check in tickets for this event.', 'attendees cannot see check-in progress');

  -- Recent bookings
  return next is(pg_temp.value_as(pg_temp.uid('oscar'), 'select count(*) || ''|'' || min(holder_name) from public.list_my_recent_bookings(10)'),
    '2|Alice Attendee', 'organizers see bookings for their events');
  return next is(pg_temp.value_as(pg_temp.uid('otto'), 'select count(*) from public.list_my_recent_bookings(10)'),
    '0', 'and only their own events');
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin queues
-- ---------------------------------------------------------------------------
create or replace function pg_temp.test_13_admin_queues() returns setof text language plpgsql as $$
declare
  v_live constant text := '20000000-0000-4000-9000-000000000002';
  v_expected text;
begin
  perform pg_temp.fixtures();
  -- Relative to whatever is already in the queues.
  v_expected := format('%s|%s|%s',
    (select count(*) + 1 from public.organizer_profiles where status = 'pending'),
    (select count(*) from public.events where status = 'pending_review'),
    (select count(*) + 1 from public.events where cancellation_requested and status <> 'cancelled'));
  perform pg_temp.value_as(pg_temp.uid('olga'), $q$select status from public.apply_as_organizer('Olga Shows', '+677 2')$q$);
  perform pg_temp.value_as(pg_temp.uid('oscar'), format($q$select status from public.request_event_cancellation(%L, 'Venue flooded')$q$, v_live));

  return next is(pg_temp.value_as(pg_temp.uid('admin'),
    $q$select pending_organizers || '|' || pending_events || '|' || cancellation_requests from public.admin_queue_counts()$q$),
    v_expected, 'admins see queue counts');
  return next is(pg_temp.value_as(pg_temp.uid('oscar'), 'select pending_events from public.admin_queue_counts()'),
    'ERROR: Admins only.', 'others cannot read queue counts');

  return next is(pg_temp.value_as(pg_temp.uid('oscar'), format($q$select status from public.decline_event_cancellation(%L, 'No')$q$, v_live)),
    'ERROR: Admins only.', 'organizers cannot decline cancellation requests');
  return next is(pg_temp.value_as(pg_temp.uid('admin'), format($q$select status from public.decline_event_cancellation(%L, ' ')$q$, v_live)),
    'ERROR: Tell the organizer why the event isn''t being cancelled.', 'declining needs a note');
  return next is(pg_temp.value_as(pg_temp.uid('admin'),
    format($q$select status || '|' || cancellation_requested from public.decline_event_cancellation(%L, 'Venue is fine now')$q$, v_live)),
    'published|false', 'admins decline: the event stays live');
  return next is((select count(*)::integer from public.notifications
    where user_id = pg_temp.uid('oscar') and title = 'Cancellation request declined'), 1, 'the organizer is told');
  return next is((select count(*)::integer from public.audit_log
    where action = 'event.cancellation_declined' and target_id = v_live), 1, 'the decision is audited');
end;
$$;

-- ---------------------------------------------------------------------------
select * from runtests(pg_my_temp_schema()::regnamespace::name, '^test_');
