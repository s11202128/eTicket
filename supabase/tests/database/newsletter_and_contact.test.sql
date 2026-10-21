-- Tests for subscribe_newsletter, submit_contact_message and who can read
-- or change newsletter_subscribers / contact_messages (pgTAP).
--
-- How to run:
--   * Supabase dashboard: paste this whole file into the SQL Editor and run it.
--     The result table lists every test as "ok N - ..." or "not ok N - ...".
--   * Supabase CLI (local stack): `supabase test db`
--
-- Safe on a real project: runtests() runs each test in its own transaction
-- and rolls it back, so fixtures (users, subscribers, messages) never persist.
-- Helpers live in pg_temp and disappear when the session ends. The only
-- lasting change is enabling the pgtap extension.

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Fixture ids
create or replace function pg_temp.uid(name text) returns uuid language sql immutable as $$
  select case name
    when 'alice' then '00000000-0000-4000-8000-00000000a11c'
    when 'admin' then '00000000-0000-4000-8000-00000000057a'
  end::uuid;
$$;

create or replace function pg_temp.fixtures() returns void language plpgsql as $$
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (pg_temp.uid('alice'), 'alice@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Alice Test"}'),
    (pg_temp.uid('admin'), 'admin@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Inbox Admin"}');
  -- No signed-in user here, so the role guard allows this.
  -- Admins must be on the authorized email list.
  insert into public.admin_emails (email) values ('admin@test.invalid') on conflict do nothing;
  update public.profiles set role = 'admin' where id = pg_temp.uid('admin');
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

-- Run a statement as a user. Returns 'ok' or the error message.
create or replace function pg_temp.try_as(p_user uuid, p_sql text) returns text language plpgsql as $$
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

-- Run a count(*) query as a user.
create or replace function pg_temp.count_as(p_user uuid, p_sql text) returns integer language plpgsql as $$
declare
  v_count integer;
begin
  perform pg_temp.act_as(p_user);
  execute p_sql into v_count;
  execute 'reset role';
  return v_count;
end;
$$;

create or replace function pg_temp.subscribe(p_user uuid, p_email text) returns text language sql as $$
  select pg_temp.try_as(p_user, format('select public.subscribe_newsletter(%L)', p_email));
$$;

create or replace function pg_temp.contact(p_user uuid, p_name text, p_email text, p_message text) returns text language sql as $$
  select pg_temp.try_as(p_user, format('select public.submit_contact_message(%L, %L, %L)', p_name, p_email, p_message));
$$;

-- ---------------------------------------------------------------------------
-- Newsletter
-- ---------------------------------------------------------------------------

create or replace function pg_temp.test_01_anyone_can_subscribe() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next is(pg_temp.subscribe(null, '  Visitor@Test.INVALID '), 'ok', 'signed-out visitors can subscribe');
  return next is(pg_temp.subscribe(pg_temp.uid('alice'), 'alice@test.invalid'), 'ok', 'signed-in users can subscribe');
  return next is(
    (select count(*)::int from public.newsletter_subscribers where email in ('visitor@test.invalid', 'alice@test.invalid')),
    2, 'both addresses are stored');
  return next is(
    (select count(*)::int from public.newsletter_subscribers where email = 'visitor@test.invalid'),
    1, 'the address is stored trimmed and lower-cased');
end;
$$;

create or replace function pg_temp.test_02_subscribing_twice_is_silent() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  perform pg_temp.subscribe(null, 'twice@test.invalid');
  return next is(pg_temp.subscribe(null, 'TWICE@test.invalid'), 'ok',
    'subscribing again succeeds (does not reveal who is subscribed)');
  return next is((select count(*)::int from public.newsletter_subscribers where email = 'twice@test.invalid'),
    1, 'the address is listed once');
end;
$$;

create or replace function pg_temp.test_03_newsletter_rejects_bad_emails() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next is(pg_temp.subscribe(null, ''), 'Enter a valid email address.', 'empty email is refused');
  return next is(pg_temp.subscribe(null, 'not-an-email'), 'Enter a valid email address.', 'email without @ is refused');
  return next is(pg_temp.subscribe(null, 'a b@test.invalid'), 'Enter a valid email address.', 'email with a space is refused');
  return next is(pg_temp.subscribe(null, repeat('a', 250) || '@x.co'), 'Enter a valid email address.',
    'emails over 254 characters are refused');
end;
$$;

create or replace function pg_temp.test_04_subscriber_list_is_admin_only() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  perform pg_temp.subscribe(null, 'listed@test.invalid');

  return next is(pg_temp.count_as(null, 'select count(*) from public.newsletter_subscribers'),
    0, 'visitors cannot read the list');
  return next is(pg_temp.count_as(pg_temp.uid('alice'), 'select count(*) from public.newsletter_subscribers'),
    0, 'signed-in users cannot read the list');
  return next is(
    pg_temp.try_as(pg_temp.uid('alice'), $q$insert into public.newsletter_subscribers (email) values ('direct@test.invalid')$q$),
    'permission denied for table newsletter_subscribers', 'subscribers cannot be inserted directly');
  return next is(
    pg_temp.try_as(null, $q$delete from public.newsletter_subscribers$q$),
    'permission denied for table newsletter_subscribers', 'visitors cannot delete subscribers');

  perform pg_temp.try_as(pg_temp.uid('alice'), $q$delete from public.newsletter_subscribers where email = 'listed@test.invalid'$q$);
  return next is((select count(*)::int from public.newsletter_subscribers where email = 'listed@test.invalid'),
    1, 'signed-in users cannot remove subscribers');

  return next is(
    pg_temp.count_as(pg_temp.uid('admin'), $q$select count(*) from public.newsletter_subscribers where email = 'listed@test.invalid'$q$),
    1, 'admins read the list');
  return next is(
    pg_temp.try_as(pg_temp.uid('admin'), $q$delete from public.newsletter_subscribers where email = 'listed@test.invalid'$q$),
    'ok', 'admins can remove a subscriber');
  return next is((select count(*)::int from public.newsletter_subscribers where email = 'listed@test.invalid'),
    0, 'the subscriber is gone');
end;
$$;

-- ---------------------------------------------------------------------------
-- Contact messages
-- ---------------------------------------------------------------------------

create or replace function pg_temp.test_05_contact_message_is_stored_and_admins_notified() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next is(pg_temp.contact(null, ' Vera ', ' Vera@Test.invalid ', ' Where is my ticket? '), 'ok',
    'signed-out visitors can send a message');
  return next is(
    (select count(*)::int from public.contact_messages
      where name = 'Vera' and email = 'vera@test.invalid' and message = 'Where is my ticket?' and handled_at is null),
    1, 'the message is stored trimmed, with a lower-cased email, as open');
  return next is(
    (select count(*)::int from public.notifications
      where user_id = pg_temp.uid('admin') and title = 'New contact message' and link = '/admin/messages'),
    1, 'admins get a notification linking to the inbox');
  return next is(
    (select count(*)::int from public.notifications where user_id = pg_temp.uid('alice') and title = 'New contact message'),
    0, 'non-admins are not notified');
end;
$$;

create or replace function pg_temp.test_06_contact_validation() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next is(pg_temp.contact(null, '  ', 'vera@test.invalid', 'Hi'),
    'Enter your name (up to 100 characters).', 'a blank name is refused');
  return next is(pg_temp.contact(null, repeat('n', 101), 'vera@test.invalid', 'Hi'),
    'Enter your name (up to 100 characters).', 'names over 100 characters are refused');
  return next is(pg_temp.contact(null, 'Vera', 'vera@', 'Hi'),
    'Enter a valid email address.', 'a bad email is refused');
  return next is(pg_temp.contact(null, 'Vera', 'vera@test.invalid', '   '),
    'Enter a message (up to 4000 characters).', 'a blank message is refused');
  return next is(pg_temp.contact(null, 'Vera', 'vera@test.invalid', repeat('m', 4001)),
    'Enter a message (up to 4000 characters).', 'messages over 4000 characters are refused');
  return next is((select count(*)::int from public.contact_messages where email = 'vera@test.invalid'),
    0, 'refused messages are not stored');
end;
$$;

create or replace function pg_temp.test_07_contact_rate_limit() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next is(pg_temp.contact(null, 'Rex', 'rex@test.invalid', 'One'), 'ok', 'first message is accepted');
  return next is(pg_temp.contact(null, 'Rex', 'rex@test.invalid', 'Two'), 'ok', 'second message is accepted');
  return next is(pg_temp.contact(null, 'Rex', 'REX@test.invalid', 'Three'), 'ok', 'third message is accepted');
  return next is(pg_temp.contact(null, 'Rex', 'Rex@Test.Invalid', 'Four'),
    'You''ve sent a few messages already. Please wait an hour before sending another.',
    'a fourth message within the hour is refused, whatever the email''s case');
  return next is(pg_temp.contact(null, 'Rex', 'other@test.invalid', 'Hello'), 'ok',
    'other addresses are not affected');

  -- An hour later the address can send again.
  update public.contact_messages set created_at = created_at - interval '61 minutes' where email = 'rex@test.invalid';
  return next is(pg_temp.contact(null, 'Rex', 'rex@test.invalid', 'Later'), 'ok', 'the limit resets after an hour');
end;
$$;

create or replace function pg_temp.test_08_inbox_is_admin_only() returns setof text language plpgsql as $$
declare
  v_id uuid;
begin
  perform pg_temp.fixtures();
  perform pg_temp.contact(pg_temp.uid('alice'), 'Alice', 'alice@test.invalid', 'Hello admins');
  v_id := (select id from public.contact_messages where email = 'alice@test.invalid');

  return next is(pg_temp.count_as(null, 'select count(*) from public.contact_messages'),
    0, 'visitors cannot read messages');
  return next is(pg_temp.count_as(pg_temp.uid('alice'), 'select count(*) from public.contact_messages'),
    0, 'senders cannot read messages, even their own');
  return next is(
    pg_temp.try_as(pg_temp.uid('alice'),
      $q$insert into public.contact_messages (name, email, message) values ('A', 'alice@test.invalid', 'Direct')$q$),
    'permission denied for table contact_messages', 'messages cannot be inserted directly');

  perform pg_temp.try_as(pg_temp.uid('alice'), format('update public.contact_messages set handled_at = now() where id = %L', v_id));
  return next is((select handled_at from public.contact_messages where id = v_id),
    null, 'non-admins cannot mark a message handled');

  return next is(
    pg_temp.count_as(pg_temp.uid('admin'), format('select count(*) from public.contact_messages where id = %L', v_id)),
    1, 'admins read messages');
  return next is(
    pg_temp.try_as(pg_temp.uid('admin'), format('update public.contact_messages set message = %L where id = %L', 'Edited', v_id)),
    'permission denied for table contact_messages', 'admins cannot edit what was sent');
  return next is(
    pg_temp.try_as(pg_temp.uid('admin'), format('delete from public.contact_messages where id = %L', v_id)),
    'permission denied for table contact_messages', 'messages cannot be deleted through the API');
end;
$$;

create or replace function pg_temp.test_09_admin_marks_handled_and_reopens() returns setof text language plpgsql as $$
declare
  v_id uuid;
begin
  perform pg_temp.fixtures();
  perform pg_temp.contact(null, 'Vera', 'vera@test.invalid', 'Please call me');
  v_id := (select id from public.contact_messages where email = 'vera@test.invalid');

  return next is(
    pg_temp.try_as(pg_temp.uid('admin'), format('update public.contact_messages set handled_at = now() where id = %L', v_id)),
    'ok', 'admins mark a message handled');
  return next ok((select handled_at is not null from public.contact_messages where id = v_id), 'handled_at is set');
  return next is((select handled_by from public.contact_messages where id = v_id),
    pg_temp.uid('admin'), 'handled_by records the admin');

  perform pg_temp.try_as(pg_temp.uid('admin'), format('update public.contact_messages set handled_at = null where id = %L', v_id));
  return next is((select handled_by from public.contact_messages where id = v_id),
    null, 'reopening clears handled_by');
end;
$$;

-- ---------------------------------------------------------------------------
-- Run everything (each test is rolled back afterwards).
-- ---------------------------------------------------------------------------
select * from runtests(pg_my_temp_schema()::regnamespace::name, '^test_');
