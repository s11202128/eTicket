-- Promo codes, add-ons and door sales.
--
--   * promo_codes: per-event discount codes (percent or fixed amount off the
--     tickets), managed by the organizer; book_ticket applies one per order.
--   * event_addons: extras sold with tickets (parking, merch, meals), with an
--     optional stock limit; book_ticket adds them to the order.
--   * door_sell_tickets: organizers and door staff sell tickets at the gate
--     for cash, card or mobile money (recorded, not processed) or as
--     complimentary. The tickets carry the buyer's name and can be checked in
--     straight away.
--
-- Orders now hold the discount, how they were sold (online/door) and who sold
-- them: total = subtotal - discount + service_fee.

-- ---------------------------------------------------------------------------
-- orders and tickets: new columns
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists discount numeric(10,2) not null default 0 check (discount >= 0),
  add column if not exists channel text not null default 'online' check (channel in ('online', 'door')),
  -- Door sales: the organizer or staff member who sold them.
  add column if not exists sold_by uuid references public.profiles (id) on delete set null;

alter table public.orders drop constraint if exists orders_check;
alter table public.orders drop constraint if exists orders_total_matches;
alter table public.orders
  add constraint orders_total_matches check (total = subtotal - discount + service_fee and discount <= subtotal);

-- Door sales: the buyer's name (they have no account). Online tickets use the
-- account holder's name, so this stays null.
alter table public.tickets
  add column if not exists holder_name text check (holder_name is null or char_length(trim(holder_name)) between 1 and 100);

-- ---------------------------------------------------------------------------
-- promo_codes
-- ---------------------------------------------------------------------------
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- Stored upper case; buyers can type any case.
  code text not null check (code ~ '^[A-Z0-9_-]{3,30}$'),
  discount_type text not null check (discount_type in ('percent', 'amount')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  -- null = unlimited; each order counts as one use.
  max_uses integer check (max_uses is null or max_uses > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, code),
  check (discount_type <> 'percent' or discount_value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

drop trigger if exists promo_codes_set_updated_at on public.promo_codes;
create trigger promo_codes_set_updated_at
  before update on public.promo_codes
  for each row execute procedure public.set_updated_at();

alter table public.orders
  add column if not exists promo_code_id uuid references public.promo_codes (id) on delete set null;

create index if not exists orders_promo_code_id_idx on public.orders (promo_code_id) where promo_code_id is not null;

alter table public.promo_codes enable row level security;

-- Codes are secret: only the organizer and admins see them. Buyers check one
-- with check_promo_code.
drop policy if exists "Organizers and admins read promo codes" on public.promo_codes;
create policy "Organizers and admins read promo codes"
  on public.promo_codes for select to authenticated
  using ((select public.is_admin()) or public.is_event_owner(event_id));

drop policy if exists "Organizers and admins add promo codes" on public.promo_codes;
create policy "Organizers and admins add promo codes"
  on public.promo_codes for insert to authenticated
  with check ((select public.is_admin()) or public.is_event_owner(event_id));

drop policy if exists "Organizers and admins update promo codes" on public.promo_codes;
create policy "Organizers and admins update promo codes"
  on public.promo_codes for update to authenticated
  using ((select public.is_admin()) or public.is_event_owner(event_id))
  with check ((select public.is_admin()) or public.is_event_owner(event_id));

drop policy if exists "Organizers and admins delete promo codes" on public.promo_codes;
create policy "Organizers and admins delete promo codes"
  on public.promo_codes for delete to authenticated
  using ((select public.is_admin()) or public.is_event_owner(event_id));

-- ---------------------------------------------------------------------------
-- event_addons and order_addons
-- ---------------------------------------------------------------------------
create table if not exists public.event_addons (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  description text check (description is null or char_length(description) <= 300),
  price numeric(10,2) not null default 0 check (price >= 0),
  -- null = unlimited
  quantity integer check (quantity is null or quantity > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name)
);

create index if not exists event_addons_event_id_idx on public.event_addons (event_id, sort_order);

drop trigger if exists event_addons_set_updated_at on public.event_addons;
create trigger event_addons_set_updated_at
  before update on public.event_addons
  for each row execute procedure public.set_updated_at();

alter table public.event_addons enable row level security;

-- Active add-ons are public wherever the event is (events RLS applies inside
-- the subquery); the organizer and admins see all of them.
drop policy if exists "Add-ons follow event visibility" on public.event_addons;
create policy "Add-ons follow event visibility"
  on public.event_addons for select to anon, authenticated
  using (
    (is_active and exists (select 1 from public.events e where e.id = event_id))
    or (select public.is_admin())
    or public.is_event_owner(event_id)
  );

drop policy if exists "Organizers and admins add add-ons" on public.event_addons;
create policy "Organizers and admins add add-ons"
  on public.event_addons for insert to authenticated
  with check ((select public.is_admin()) or public.is_event_owner(event_id));

drop policy if exists "Organizers and admins update add-ons" on public.event_addons;
create policy "Organizers and admins update add-ons"
  on public.event_addons for update to authenticated
  using ((select public.is_admin()) or public.is_event_owner(event_id))
  with check ((select public.is_admin()) or public.is_event_owner(event_id));

-- Sold add-ons can't be deleted (order_addons restricts); hide them instead.
drop policy if exists "Organizers and admins delete add-ons" on public.event_addons;
create policy "Organizers and admins delete add-ons"
  on public.event_addons for delete to authenticated
  using ((select public.is_admin()) or public.is_event_owner(event_id));

create table if not exists public.order_addons (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  addon_id uuid not null references public.event_addons (id) on delete restrict,
  quantity integer not null check (quantity between 1 and 20),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  unique (order_id, addon_id)
);

create index if not exists order_addons_addon_id_idx on public.order_addons (addon_id);

alter table public.order_addons enable row level security;

-- Visible with the order (orders RLS applies inside the subquery).
drop policy if exists "Order add-ons follow their order" on public.order_addons;
create policy "Order add-ons follow their order"
  on public.order_addons for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));

revoke insert, update, delete on public.order_addons from anon, authenticated;

-- Add-ons sold so far, for the booking panel (paid and awaiting payment).
create or replace function public.get_addon_counts(p_event_ids uuid[])
returns table (addon_id uuid, sold integer)
language sql
stable
security definer
set search_path = ''
as $$
  select oa.addon_id, sum(oa.quantity)::integer
  from public.order_addons oa
  join public.orders o on o.id = oa.order_id
  join public.events e on e.id = o.event_id
  where o.event_id = any(p_event_ids)
    and o.status in ('paid', 'pending_payment')
    and (e.status in ('published', 'completed') or public.is_admin() or e.organizer_id = auth.uid())
  group by oa.addon_id;
$$;

revoke execute on function public.get_addon_counts(uuid[]) from public;
grant execute on function public.get_addon_counts(uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable from the app)
-- ---------------------------------------------------------------------------

-- Refuse more tickets of a type than it has left. Call with the event locked.
create or replace function public.assert_ticket_type_available(p_type public.ticket_types, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sold integer;
begin
  if p_type.quantity is null then
    return;
  end if;

  select count(*) into v_sold
  from public.tickets
  where ticket_type_id = p_type.id and status in ('active', 'used');

  if v_sold >= p_type.quantity then
    raise exception '% is sold out.', p_type.name using errcode = 'P0001';
  elsif v_sold + p_quantity > p_type.quantity then
    raise exception 'Only % left for %.', p_type.quantity - v_sold, p_type.name using errcode = 'P0001';
  end if;
end;
$$;

-- One ticket row per seat, each with a random 12-character code.
create or replace function public.issue_tickets(
  p_order_id uuid,
  p_type public.ticket_types,
  p_user_id uuid,
  p_quantity integer,
  p_holder_name text default null,
  p_check_in boolean default false
)
returns setof public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets%rowtype;
begin
  for seat in 1..p_quantity loop
    -- Retry on the (very unlikely) code collision.
    for attempt in 1..5 loop
      begin
        insert into public.tickets (
          event_id, ticket_type_id, user_id, order_id, unit_price, holder_name, code,
          status, checked_in_at, checked_in_by
        )
        values (
          p_type.event_id, p_type.id, p_user_id, p_order_id, p_type.price, nullif(trim(p_holder_name), ''),
          upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
          case when p_check_in then 'used' else 'active' end,
          case when p_check_in then timezone('utc', now()) end,
          case when p_check_in then auth.uid() end
        )
        returning * into v_ticket;
        exit;
      exception when unique_violation then
        if attempt = 5 then
          raise;
        end if;
      end;
    end loop;
    return next v_ticket;
  end loop;
end;
$$;

revoke execute on function public.assert_ticket_type_available(public.ticket_types, integer) from public, anon, authenticated;
revoke execute on function public.issue_tickets(uuid, public.ticket_types, uuid, integer, text, boolean) from public, anon, authenticated;

-- A usable promo code for an event, or an error saying why not.
create or replace function public.find_promo_code(p_event_id uuid, p_code text)
returns public.promo_codes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_promo public.promo_codes%rowtype;
  v_used integer;
begin
  select * into v_promo
  from public.promo_codes
  where event_id = p_event_id and code = upper(trim(p_code));

  if not found or not v_promo.is_active then
    raise exception 'That promo code isn''t valid for this event.' using errcode = 'P0001';
  end if;

  if v_promo.starts_at is not null and v_promo.starts_at > now() then
    raise exception 'That promo code isn''t active yet.' using errcode = 'P0001';
  end if;

  if v_promo.ends_at is not null and v_promo.ends_at <= now() then
    raise exception 'That promo code has expired.' using errcode = 'P0001';
  end if;

  if v_promo.max_uses is not null then
    select count(*) into v_used
    from public.orders
    where promo_code_id = v_promo.id and status in ('paid', 'pending_payment');

    if v_used >= v_promo.max_uses then
      raise exception 'That promo code has been used up.' using errcode = 'P0001';
    end if;
  end if;

  return v_promo;
end;
$$;

revoke execute on function public.find_promo_code(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- check_promo_code: lets the booking panel show the discount before booking
-- ---------------------------------------------------------------------------
create or replace function public.check_promo_code(p_event_id uuid, p_code text)
returns table (code text, discount_type text, discount_value numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_promo public.promo_codes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to use a promo code.' using errcode = '28000';
  end if;

  v_promo := public.find_promo_code(p_event_id, p_code);
  return query select v_promo.code, v_promo.discount_type, v_promo.discount_value;
end;
$$;

revoke execute on function public.check_promo_code(uuid, text) from public, anon;
grant execute on function public.check_promo_code(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- book_ticket(type, quantity, promo code, add-ons)
--   p_addons: [{"id": "<event_addons.id>", "quantity": 2}, ...]
-- ---------------------------------------------------------------------------
drop function if exists public.book_ticket(uuid, integer);

create or replace function public.book_ticket(
  p_ticket_type_id uuid,
  p_quantity integer default 1,
  p_promo_code text default null,
  p_addons jsonb default '[]'::jsonb
)
returns setof public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_type public.ticket_types%rowtype;
  v_event public.events%rowtype;
  v_settings public.payment_settings%rowtype;
  v_promo public.promo_codes%rowtype;
  v_addon public.event_addons%rowtype;
  v_line record;
  v_addon_sold integer;
  v_mine integer;
  v_tickets_subtotal numeric(10,2);
  v_addons_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_fee numeric(10,2);
  v_total numeric(10,2);
  v_provider text;
  v_order_id uuid;
  v_ticket public.tickets%rowtype;
  v_first_code text;
begin
  if v_user_id is null then
    raise exception 'Please sign in to book tickets.' using errcode = '28000';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 10 then
    raise exception 'Choose between 1 and 10 tickets.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_addons, '[]'::jsonb)) <> 'array' then
    raise exception 'Add-ons must be a list.' using errcode = '22023';
  end if;

  select * into v_type from public.ticket_types where id = p_ticket_type_id;
  if not found then
    raise exception 'This ticket type is not available.' using errcode = 'P0002';
  end if;

  -- Lock the event row: bookings for one event are processed one at a time,
  -- so the last seats (and add-ons) can't be oversold.
  select * into v_event from public.events where id = v_type.event_id for update;

  if v_event.status <> 'published' then
    raise exception 'This event is not available for booking.' using errcode = 'P0002';
  end if;

  if v_event.starts_at <= now() then
    raise exception 'This event has already started.' using errcode = 'P0001';
  end if;

  if v_type.sales_start is not null and v_type.sales_start > now() then
    raise exception 'Sales for % haven''t started yet.', v_type.name using errcode = 'P0001';
  end if;

  if v_type.sales_end is not null and v_type.sales_end <= now() then
    raise exception 'Sales for % have ended.', v_type.name using errcode = 'P0001';
  end if;

  perform public.assert_ticket_type_available(v_type, p_quantity);

  -- Door-sale tickets (holder_name set) don't count toward the seller's limit.
  select count(*) into v_mine
  from public.tickets
  where event_id = v_event.id and user_id = v_user_id and status in ('active', 'used') and holder_name is null;

  if v_mine >= v_event.max_tickets_per_user then
    raise exception 'You can book at most % tickets for this event.', v_event.max_tickets_per_user
      using errcode = 'P0001';
  elsif v_mine + p_quantity > v_event.max_tickets_per_user then
    raise exception 'You can book % more ticket(s) for this event.', v_event.max_tickets_per_user - v_mine
      using errcode = 'P0001';
  end if;

  -- Add-ons: each listed once, from this event, active and in stock.
  for v_line in
    select (item->>'id')::uuid as addon_id, sum((item->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(coalesce(p_addons, '[]'::jsonb)) as item
    group by 1
  loop
    if v_line.quantity is null or v_line.quantity < 1 or v_line.quantity > 20 then
      raise exception 'Choose between 1 and 20 of each add-on.' using errcode = '22023';
    end if;

    select * into v_addon from public.event_addons where id = v_line.addon_id and event_id = v_event.id;
    if not found or not v_addon.is_active then
      raise exception 'An add-on you chose isn''t available.' using errcode = 'P0002';
    end if;

    if v_addon.quantity is not null then
      select coalesce(sum(oa.quantity), 0) into v_addon_sold
      from public.order_addons oa
      join public.orders o on o.id = oa.order_id
      where oa.addon_id = v_addon.id and o.status in ('paid', 'pending_payment');

      if v_addon_sold + v_line.quantity > v_addon.quantity then
        raise exception 'Only % left of %.', greatest(v_addon.quantity - v_addon_sold, 0), v_addon.name
          using errcode = 'P0001';
      end if;
    end if;

    v_addons_subtotal := v_addons_subtotal + v_addon.price * v_line.quantity;
  end loop;

  -- Price the order: the promo code discounts the tickets only; the service
  -- fee is charged on what's left. Free orders never pay a fee.
  v_tickets_subtotal := v_type.price * p_quantity;

  if nullif(trim(p_promo_code), '') is not null then
    v_promo := public.find_promo_code(v_event.id, p_promo_code);
    v_discount := case v_promo.discount_type
      when 'percent' then round(v_tickets_subtotal * v_promo.discount_value / 100, 2)
      else least(v_promo.discount_value, v_tickets_subtotal)
    end;
  end if;

  select * into v_settings from public.payment_settings where id;
  v_total := v_tickets_subtotal + v_addons_subtotal - v_discount;
  v_fee := case when v_total = 0 then 0
    else round(v_total * coalesce(v_settings.service_fee_percent, 0) / 100, 2) end;
  v_total := v_total + v_fee;

  if v_total = 0 then
    v_provider := 'free';
  elsif coalesce(v_settings.mode, 'test') = 'test' then
    -- No payment provider yet: confirm at once without taking money.
    v_provider := 'test';
  else
    raise exception 'Online payment isn''t available yet. Please try again later.' using errcode = 'P0001';
  end if;

  insert into public.orders (
    user_id, event_id, status, channel, currency, subtotal, discount, service_fee, total,
    promo_code_id, payment_provider, paid_at
  )
  values (
    v_user_id, v_event.id, 'paid', 'online', coalesce(v_settings.currency, 'SBD'),
    v_tickets_subtotal + v_addons_subtotal, v_discount, v_fee, v_total,
    v_promo.id, v_provider, now()
  )
  returning id into v_order_id;

  insert into public.order_addons (order_id, addon_id, quantity, unit_price)
  select v_order_id, a.id, l.quantity, a.price
  from (
    select (item->>'id')::uuid as addon_id, sum((item->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(coalesce(p_addons, '[]'::jsonb)) as item
    group by 1
  ) l
  join public.event_addons a on a.id = l.addon_id;

  for v_ticket in select * from public.issue_tickets(v_order_id, v_type, v_user_id, p_quantity) loop
    v_first_code := coalesce(v_first_code, v_ticket.code);
    return next v_ticket;
  end loop;

  perform public.notify_user(
    v_user_id,
    'Booking confirmed',
    format('%s × %s for %s. Your tickets are ready.', p_quantity, v_type.name, v_event.title),
    case when p_quantity = 1 then '/tickets/' || v_first_code else '/tickets' end
  );

  return;
end;
$$;

revoke execute on function public.book_ticket(uuid, integer, text, jsonb) from public, anon;
grant execute on function public.book_ticket(uuid, integer, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- door_sell_tickets: sell at the gate (organizer, door staff or admin)
--   p_payment_method: cash | card | mobile_money | complimentary
-- ---------------------------------------------------------------------------
create or replace function public.door_sell_tickets(
  p_ticket_type_id uuid,
  p_quantity integer,
  p_holder_name text,
  p_payment_method text,
  p_check_in boolean default true
)
returns setof public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seller uuid := auth.uid();
  v_type public.ticket_types%rowtype;
  v_event public.events%rowtype;
  v_settings public.payment_settings%rowtype;
  v_subtotal numeric(10,2);
  v_order_id uuid;
begin
  if v_seller is null then
    raise exception 'Please sign in.' using errcode = '28000';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 20 then
    raise exception 'Sell between 1 and 20 tickets at a time.' using errcode = '22023';
  end if;

  if p_holder_name is null or char_length(trim(p_holder_name)) not between 1 and 100 then
    raise exception 'Enter the buyer''s name.' using errcode = '22023';
  end if;

  if p_payment_method is null or p_payment_method not in ('cash', 'card', 'mobile_money', 'complimentary') then
    raise exception 'Choose how the buyer paid.' using errcode = '22023';
  end if;

  select * into v_type from public.ticket_types where id = p_ticket_type_id;
  if not found then
    raise exception 'This ticket type is not available.' using errcode = 'P0002';
  end if;

  if not public.can_check_in(v_type.event_id) then
    raise exception 'You can''t sell tickets for this event.' using errcode = '42501';
  end if;

  select * into v_event from public.events where id = v_type.event_id for update;

  if v_event.status <> 'published' then
    raise exception 'This event is not available for sale.' using errcode = 'P0002';
  end if;

  -- Door sales run until the event ends (the same window as check-in).
  if now() > coalesce(v_event.end_at, v_event.starts_at + interval '12 hours') then
    raise exception 'This event has ended.' using errcode = 'P0001';
  end if;

  -- Same opening time as check_in_ticket.
  if coalesce(p_check_in, true) and now() < v_event.starts_at - interval '6 hours' then
    raise exception 'Check-in opens 6 hours before the event. Sell without checking in, or wait.'
      using errcode = 'P0001';
  end if;

  perform public.assert_ticket_type_available(v_type, p_quantity);

  select * into v_settings from public.payment_settings where id;
  v_subtotal := v_type.price * p_quantity;

  -- Paid in person, so no online service fee; complimentary tickets are a
  -- full discount.
  insert into public.orders (
    user_id, event_id, status, channel, sold_by, currency, subtotal, discount, service_fee, total,
    payment_provider, paid_at
  )
  values (
    v_seller, v_event.id, 'paid', 'door', v_seller, coalesce(v_settings.currency, 'SBD'),
    v_subtotal,
    case when p_payment_method = 'complimentary' then v_subtotal else 0 end,
    0,
    case when p_payment_method = 'complimentary' then 0 else v_subtotal end,
    p_payment_method, now()
  )
  returning id into v_order_id;

  return query
    select * from public.issue_tickets(v_order_id, v_type, v_seller, p_quantity, trim(p_holder_name), coalesce(p_check_in, true));
end;
$$;

revoke execute on function public.door_sell_tickets(uuid, integer, text, text, boolean) from public, anon;
grant execute on function public.door_sell_tickets(uuid, integer, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Door-sale tickets show the buyer's name, not the seller's
-- ---------------------------------------------------------------------------
create or replace function public.list_event_attendees(p_event_id uuid)
returns table (
  ticket_id uuid, code text, status text, booked_at timestamptz, checked_in_at timestamptz,
  ticket_type_id uuid, ticket_type_name text, holder_name text, holder_email text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_event_owner(p_event_id)) then
    raise exception 'Only the event organizer can see attendees.' using errcode = '42501';
  end if;

  return query
    select t.id, t.code, t.status, t.created_at, t.checked_in_at, tt.id, tt.name,
      coalesce(t.holder_name, p.full_name),
      case when t.holder_name is null then p.email end
    from public.tickets t
    join public.ticket_types tt on tt.id = t.ticket_type_id
    left join public.profiles p on p.id = t.user_id
    where t.event_id = p_event_id
    order by t.created_at desc;
end;
$$;

create or replace function public.list_my_recent_bookings(p_limit integer default 10)
returns table (
  ticket_id uuid, event_id uuid, event_title text, ticket_type_name text, holder_name text, status text,
  booked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, e.id, e.title, tt.name, coalesce(t.holder_name, p.full_name), t.status, t.created_at
  from public.tickets t
  join public.events e on e.id = t.event_id
  join public.ticket_types tt on tt.id = t.ticket_type_id
  left join public.profiles p on p.id = t.user_id
  where e.organizer_id = (select auth.uid())
  order by t.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

create or replace function public.check_in_ticket(p_code text, p_event_id uuid default null)
returns table (
  result text, ticket_id uuid, code text, status text, event_id uuid, event_title text,
  starts_at timestamptz, holder_name text, checked_in_at timestamptz, ticket_type_name text
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
  v_type_name text;
  v_result text;
begin
  if p_event_id is null then
    if not public.is_admin() then
      raise exception 'Choose the event you are checking in for.' using errcode = '42501';
    end if;
  elsif not public.can_check_in(p_event_id) then
    raise exception 'You can''t check in tickets for this event.' using errcode = '42501';
  end if;

  v_code := upper(regexp_replace(trim(coalesce(p_code, '')), '^ETICKET-', '', 'i'));

  select * into v_ticket from public.tickets t where t.code = v_code for update;

  if not found then
    return query select 'not_found'::text, null::uuid, v_code, null::text, null::uuid,
      null::text, null::timestamptz, null::text, null::timestamptz, null::text;
    return;
  end if;

  if p_event_id is not null and v_ticket.event_id <> p_event_id then
    return query select 'wrong_event'::text, null::uuid, v_code, null::text, null::uuid,
      null::text, null::timestamptz, null::text, null::timestamptz, null::text;
    return;
  end if;

  select * into v_event from public.events e where e.id = v_ticket.event_id;
  select tt.name into v_type_name from public.ticket_types tt where tt.id = v_ticket.ticket_type_id;
  if v_ticket.holder_name is not null then
    v_holder := v_ticket.holder_name;
  else
    select coalesce(nullif(trim(p.full_name), ''), p.email, 'Guest') into v_holder
    from public.profiles p where p.id = v_ticket.user_id;
  end if;

  if v_ticket.status = 'used' then
    v_result := 'already_used';
  elsif v_ticket.status = 'cancelled' or v_event.status = 'cancelled' then
    v_result := 'cancelled';
  elsif now() < v_event.starts_at - interval '6 hours'
     or now() > coalesce(v_event.end_at, v_event.starts_at + interval '12 hours') then
    v_result := 'wrong_date';
  else
    update public.tickets t
    set status = 'used', checked_in_at = timezone('utc', now()), checked_in_by = auth.uid()
    where t.id = v_ticket.id
    returning * into v_ticket;
    v_result := 'valid';
  end if;

  return query select v_result, v_ticket.id, v_ticket.code, v_ticket.status, v_event.id,
    v_event.title, v_event.starts_at, v_holder, v_ticket.checked_in_at, v_type_name;
end;
$$;
