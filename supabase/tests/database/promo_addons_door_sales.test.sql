-- Tests for promo codes, add-ons and door sales (pgTAP).
-- Booking basics: booking_and_checkin.test.sql
--
-- How to run: paste this whole file into the Supabase SQL Editor (or
-- `supabase test db` locally). Each test runs in its own transaction and is
-- rolled back, so fixtures never persist.

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function pg_temp.uid(name text) returns uuid language sql immutable as $$
  select case name
    when 'alice' then '00000000-0000-4000-8000-00000000a11c'
    when 'bob'   then '00000000-0000-4000-8000-000000000b0b'
    when 'admin' then '00000000-0000-4000-8000-00000000057a'
  end::uuid;
$$;

create or replace function pg_temp.eid(name text) returns uuid language sql immutable as $$
  select case name
    when 'gig'   then '00000000-0000-4000-9000-000000000011' -- SI$50 tickets, in 2 days
    when 'small' then '00000000-0000-4000-9000-000000000012' -- 2 seats, 1 per person, free
    when 'other' then '00000000-0000-4000-9000-000000000013' -- another event
  end::uuid;
$$;

create or replace function pg_temp.fixtures() returns void language plpgsql as $$
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (pg_temp.uid('alice'), 'alice@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Alice Test"}'),
    (pg_temp.uid('bob'),   'bob@test.invalid',   'authenticated', 'authenticated', '{"full_name":"Bob Test"}'),
    (pg_temp.uid('admin'), 'admin@test.invalid', 'authenticated', 'authenticated', '{"full_name":"Door Admin"}');
  insert into public.admin_emails (email) values ('admin@test.invalid') on conflict do nothing;
  update public.profiles set role = 'admin' where id = pg_temp.uid('admin');
  update public.payment_settings set mode = 'test', service_fee_percent = 0 where id;

  insert into public.events (id, title, slug, starts_at, location, status, capacity, max_tickets_per_user) values
    (pg_temp.eid('gig'),   'Big Gig',   'test-big-gig',   now() + interval '2 days', 'Hall', 'published', null, 4),
    (pg_temp.eid('small'), 'Small Gig', 'test-small-gig', now() + interval '1 hour', 'Hall', 'published', 2, 1),
    (pg_temp.eid('other'), 'Other Gig', 'test-other-gig', now() + interval '3 days', 'Hall', 'published', null, 4);

  insert into public.ticket_types (event_id, name, price, quantity) values
    (pg_temp.eid('gig'),   'General Admission', 50, null),
    (pg_temp.eid('small'), 'General Admission', 0, 2),
    (pg_temp.eid('other'), 'General Admission', 20, null);
end;
$$;

create or replace function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create or replace function pg_temp.type_of(p_event uuid) returns uuid language sql stable as $$
  select id from public.ticket_types where event_id = p_event order by sort_order limit 1;
$$;

-- Book as a user. Returns 'ok:<order id>' or the error message.
create or replace function pg_temp.try_book(
  p_user uuid, p_event uuid, p_quantity integer default 1, p_promo text default null, p_addons jsonb default '[]'
) returns text language plpgsql as $$
declare
  v_type uuid := pg_temp.type_of(p_event);
  v_ticket public.tickets%rowtype;
  v_result text;
begin
  perform pg_temp.act_as(p_user);
  begin
    select * into v_ticket from public.book_ticket(v_type, p_quantity, p_promo, p_addons) limit 1;
    v_result := 'ok:' || v_ticket.order_id;
  exception when others then
    v_result := sqlerrm;
  end;
  execute 'reset role';
  return v_result;
end;
$$;

-- Sell at the door as a user. Returns 'ok:<order id>' or the error message.
create or replace function pg_temp.try_door_sell(
  p_user uuid, p_event uuid, p_quantity integer, p_method text, p_check_in boolean default true
) returns text language plpgsql as $$
declare
  v_type uuid := pg_temp.type_of(p_event);
  v_ticket public.tickets%rowtype;
  v_result text;
begin
  perform pg_temp.act_as(p_user);
  begin
    select * into v_ticket from public.door_sell_tickets(v_type, p_quantity, 'Walk In', p_method, p_check_in) limit 1;
    v_result := 'ok:' || v_ticket.order_id;
  exception when others then
    v_result := sqlerrm;
  end;
  execute 'reset role';
  return v_result;
end;
$$;

-- Volatile on purpose: it must see the order the same statement just created.
create or replace function pg_temp.order_of(result text) returns public.orders language sql volatile as $$
  select * from public.orders where id = substr(result, 4)::uuid;
$$;

create or replace function pg_temp.add_promo(
  p_event uuid, p_code text, p_type text, p_value numeric, p_max integer default null
) returns void language sql as $$
  insert into public.promo_codes (event_id, code, discount_type, discount_value, max_uses)
  values (p_event, p_code, p_type, p_value, p_max);
$$;

create or replace function pg_temp.add_addon(p_event uuid, p_name text, p_price numeric, p_quantity integer default null)
returns uuid language sql as $$
  insert into public.event_addons (event_id, name, price, quantity) values (p_event, p_name, p_price, p_quantity)
  returning id;
$$;

-- ---------------------------------------------------------------------------
-- Promo codes
-- ---------------------------------------------------------------------------

create or replace function pg_temp.test_01_percent_promo_discounts_tickets() returns setof text language plpgsql as $$
declare
  v_order public.orders;
begin
  perform pg_temp.fixtures();
  perform pg_temp.add_promo(pg_temp.eid('gig'), 'SAVE10', 'percent', 10);
  v_order := pg_temp.order_of(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('gig'), 2, 'save10'));
  return next is(v_order.subtotal, 100.00::numeric, 'subtotal is 2 × SI$50');
  return next is(v_order.discount, 10.00::numeric, '10% off, code typed in lower case');
  return next is(v_order.total, 90.00::numeric, 'total after the discount');
  return next isnt(v_order.promo_code_id, null, 'the order records the code');
end;
$$;

create or replace function pg_temp.test_02_promo_rules() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  perform pg_temp.add_promo(pg_temp.eid('gig'), 'ONCE', 'amount', 5, 1);
  perform pg_temp.add_promo(pg_temp.eid('other'), 'ELSEWHERE', 'percent', 50);
  return next is(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('gig'), 1, 'NOPE'),
    'That promo code isn''t valid for this event.', 'unknown codes are refused');
  return next is(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('gig'), 1, 'ELSEWHERE'),
    'That promo code isn''t valid for this event.', 'codes only work for their own event');
  return next matches(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('gig'), 1, 'ONCE'), '^ok:', 'first use works');
  return next is(pg_temp.try_book(pg_temp.uid('bob'), pg_temp.eid('gig'), 1, 'ONCE'),
    'That promo code has been used up.', 'max uses is enforced');
  update public.promo_codes set ends_at = now() - interval '1 minute', starts_at = null where code = 'ELSEWHERE';
  return next is(pg_temp.try_book(pg_temp.uid('bob'), pg_temp.eid('other'), 1, 'ELSEWHERE'),
    'That promo code has expired.', 'expired codes are refused');
end;
$$;

create or replace function pg_temp.test_03_amount_promo_never_goes_below_zero() returns setof text language plpgsql as $$
declare
  v_order public.orders;
begin
  perform pg_temp.fixtures();
  perform pg_temp.add_promo(pg_temp.eid('gig'), 'COMP', 'amount', 500);
  v_order := pg_temp.order_of(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('gig'), 1, 'COMP'));
  return next is(v_order.discount, 50.00::numeric, 'the discount is capped at the ticket price');
  return next is(v_order.total, 0.00::numeric, 'nothing to pay');
  return next is(v_order.payment_provider, 'free', 'a fully discounted order is free');
end;
$$;

create or replace function pg_temp.test_04_promo_codes_are_secret() returns setof text language plpgsql as $$
declare
  v_type text;
begin
  perform pg_temp.fixtures();
  perform pg_temp.add_promo(pg_temp.eid('gig'), 'SECRET', 'percent', 20);
  perform pg_temp.act_as(pg_temp.uid('bob'));
  return next is((select count(*)::int from public.promo_codes), 0, 'attendees cannot list promo codes');
  select discount_type into v_type from public.check_promo_code(pg_temp.eid('gig'), 'secret');
  execute 'reset role';
  return next is(v_type, 'percent', 'check_promo_code confirms a code the buyer knows');
end;
$$;

-- ---------------------------------------------------------------------------
-- Add-ons
-- ---------------------------------------------------------------------------

create or replace function pg_temp.test_05_addons_are_added_to_the_order() returns setof text language plpgsql as $$
declare
  v_parking uuid;
  v_order public.orders;
begin
  perform pg_temp.fixtures();
  v_parking := pg_temp.add_addon(pg_temp.eid('gig'), 'Parking', 10, 3);
  update public.payment_settings set service_fee_percent = 4 where id;
  v_order := pg_temp.order_of(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('gig'), 1, null,
    jsonb_build_array(jsonb_build_object('id', v_parking, 'quantity', 2))));
  return next is(v_order.subtotal, 70.00::numeric, 'subtotal is the ticket plus 2 parking passes');
  return next is(v_order.service_fee, 2.80::numeric, 'the fee is charged on add-ons too');
  return next is(v_order.total, 72.80::numeric, 'total includes add-ons and fee');
  return next is((select quantity from public.order_addons where order_id = v_order.id), 2, 'the add-on line is stored');
  return next is(pg_temp.try_book(pg_temp.uid('bob'), pg_temp.eid('gig'), 1, null,
    jsonb_build_array(jsonb_build_object('id', v_parking, 'quantity', 2))),
    'Only 1 left of Parking.', 'add-on stock is enforced');
end;
$$;

create or replace function pg_temp.test_06_addons_must_belong_to_the_event() returns setof text language plpgsql as $$
declare
  v_elsewhere uuid;
  v_hidden uuid;
begin
  perform pg_temp.fixtures();
  v_elsewhere := pg_temp.add_addon(pg_temp.eid('other'), 'T-shirt', 30);
  v_hidden := pg_temp.add_addon(pg_temp.eid('gig'), 'Old merch', 5);
  update public.event_addons set is_active = false where id = v_hidden;
  return next is(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('gig'), 1, null,
    jsonb_build_array(jsonb_build_object('id', v_elsewhere, 'quantity', 1))),
    'An add-on you chose isn''t available.', 'add-ons from another event are refused');
  return next is(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('gig'), 1, null,
    jsonb_build_array(jsonb_build_object('id', v_hidden, 'quantity', 1))),
    'An add-on you chose isn''t available.', 'hidden add-ons are refused');
  return next is((select count(*)::int from public.orders where user_id = pg_temp.uid('alice')), 0,
    'a refused booking leaves no order behind');
end;
$$;

-- ---------------------------------------------------------------------------
-- Door sales
-- ---------------------------------------------------------------------------

create or replace function pg_temp.test_07_door_sale_issues_checked_in_tickets() returns setof text language plpgsql as $$
declare
  v_result text;
  v_order public.orders;
begin
  perform pg_temp.fixtures();
  update public.payment_settings set service_fee_percent = 4 where id;
  return next is(pg_temp.try_door_sell(pg_temp.uid('admin'), pg_temp.eid('gig'), 1, 'cash'),
    'Check-in opens 6 hours before the event. Sell without checking in, or wait.',
    'tickets can''t be checked in days before the event');
  update public.events set starts_at = now() + interval '1 hour' where id = pg_temp.eid('gig');
  v_result := pg_temp.try_door_sell(pg_temp.uid('admin'), pg_temp.eid('gig'), 2, 'cash');
  v_order := pg_temp.order_of(v_result);
  return next is(v_order.channel, 'door', 'the order is a door sale');
  return next is(v_order.payment_provider, 'cash', 'the payment method is recorded');
  return next is(v_order.total, 100.00::numeric, 'no online service fee at the door');
  return next is(v_order.sold_by, pg_temp.uid('admin'), 'the seller is recorded');
  return next is(
    (select count(*)::int from public.tickets where order_id = v_order.id and status = 'used' and holder_name = 'Walk In'),
    2, 'both tickets carry the buyer''s name and are checked in');
end;
$$;

create or replace function pg_temp.test_08_complimentary_and_permissions() returns setof text language plpgsql as $$
declare
  v_order public.orders;
begin
  perform pg_temp.fixtures();
  v_order := pg_temp.order_of(pg_temp.try_door_sell(pg_temp.uid('admin'), pg_temp.eid('gig'), 1, 'complimentary', false));
  return next is(v_order.total, 0.00::numeric, 'complimentary tickets cost nothing');
  return next is(v_order.discount, 50.00::numeric, 'and show as a full discount');
  return next is((select status from public.tickets where order_id = v_order.id), 'active',
    'tickets can be issued without checking in');
  return next is(pg_temp.try_door_sell(pg_temp.uid('bob'), pg_temp.eid('gig'), 1, 'cash'),
    'You can''t sell tickets for this event.', 'attendees cannot sell at the door');
  return next is(pg_temp.try_door_sell(pg_temp.uid('admin'), pg_temp.eid('gig'), 1, 'cheque'),
    'Choose how the buyer paid.', 'unknown payment methods are refused');
end;
$$;

create or replace function pg_temp.test_09_door_sales_share_capacity_not_limits() returns setof text language plpgsql as $$
begin
  perform pg_temp.fixtures();
  return next matches(pg_temp.try_door_sell(pg_temp.uid('admin'), pg_temp.eid('small'), 1, 'cash'), '^ok:',
    'seat 1 of 2 sold at the door');
  return next matches(pg_temp.try_book(pg_temp.uid('admin'), pg_temp.eid('small')), '^ok:',
    'door sales don''t use up the seller''s own per-person limit');
  return next is(pg_temp.try_door_sell(pg_temp.uid('admin'), pg_temp.eid('small'), 1, 'cash'),
    'General Admission is sold out.', 'door sales respect capacity');
end;
$$;

create or replace function pg_temp.test_10_attendee_list_shows_buyer_name() returns setof text language plpgsql as $$
declare
  v_name text;
  v_email text;
begin
  perform pg_temp.fixtures();
  perform pg_temp.try_door_sell(pg_temp.uid('admin'), pg_temp.eid('gig'), 1, 'cash', false);
  perform pg_temp.act_as(pg_temp.uid('admin'));
  select holder_name, holder_email into v_name, v_email from public.list_event_attendees(pg_temp.eid('gig'));
  execute 'reset role';
  return next is(v_name, 'Walk In', 'door tickets list the buyer, not the seller');
  return next is(v_email, null, 'and don''t show the seller''s email');
end;
$$;

create or replace function pg_temp.test_11_cancelling_all_tickets_frees_addons() returns setof text language plpgsql as $$
declare
  v_parking uuid;
  v_order public.orders;
  v_ticket uuid;
begin
  perform pg_temp.fixtures();
  v_parking := pg_temp.add_addon(pg_temp.eid('gig'), 'Parking', 10, 1);
  v_order := pg_temp.order_of(pg_temp.try_book(pg_temp.uid('alice'), pg_temp.eid('gig'), 1, null,
    jsonb_build_array(jsonb_build_object('id', v_parking, 'quantity', 1))));
  return next is(pg_temp.try_book(pg_temp.uid('bob'), pg_temp.eid('gig'), 1, null,
    jsonb_build_array(jsonb_build_object('id', v_parking, 'quantity', 1))),
    'Only 0 left of Parking.', 'the last parking pass is taken');

  v_ticket := (select id from public.tickets where order_id = v_order.id);
  perform pg_temp.act_as(pg_temp.uid('alice'));
  perform public.cancel_my_ticket(v_ticket);
  execute 'reset role';

  return next is((select status from public.orders where id = v_order.id), 'cancelled',
    'cancelling every ticket cancels the order');
  return next matches(pg_temp.try_book(pg_temp.uid('bob'), pg_temp.eid('gig'), 1, null,
    jsonb_build_array(jsonb_build_object('id', v_parking, 'quantity', 1))), '^ok:',
    'the freed parking pass can be booked again');
end;
$$;

-- ---------------------------------------------------------------------------
-- Run everything (each test is rolled back afterwards).
-- ---------------------------------------------------------------------------
select * from runtests(pg_my_temp_schema()::regnamespace::name, '^test_');
