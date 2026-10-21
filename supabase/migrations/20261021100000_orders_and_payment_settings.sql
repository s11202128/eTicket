-- Orders and payment settings: every booking now creates an order that
-- records what was charged, so a real payment provider can be plugged in
-- later without changing how tickets work.
--
-- For now no provider is connected:
--   * free orders (total 0) are paid at once with provider 'free';
--   * in 'test' mode (the default) paid orders are also confirmed at once with
--     provider 'test' and no money is taken;
--   * in 'live' mode book_ticket refuses paid orders until a provider is wired
--     in, so switching modes can never give paid tickets away for free.

-- ---------------------------------------------------------------------------
-- payment_settings: one row
-- ---------------------------------------------------------------------------
create table if not exists public.payment_settings (
  id boolean primary key default true check (id),
  mode text not null default 'test' check (mode in ('test', 'live')),
  -- ISO 4217; keep in step with siteConfig.currency.code in the app.
  currency text not null default 'SBD' check (char_length(currency) = 3),
  -- Added on top of the ticket subtotal (e.g. 4 = 4%); 0 = no fee.
  service_fee_percent numeric(5,2) not null default 0
    check (service_fee_percent >= 0 and service_fee_percent <= 50),
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists payment_settings_set_updated_at on public.payment_settings;
create trigger payment_settings_set_updated_at
  before update on public.payment_settings
  for each row execute procedure public.set_updated_at();

alter table public.payment_settings enable row level security;

-- The booking panel reads the mode and fee to show the right total.
drop policy if exists "Anyone reads payment settings" on public.payment_settings;
create policy "Anyone reads payment settings"
  on public.payment_settings for select to anon, authenticated
  using (true);

-- Changed only from the Supabase dashboard (or a future admin function).
revoke insert, update, delete on public.payment_settings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- orders: one per booking
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete restrict,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'failed', 'cancelled', 'refunded')),
  currency text not null check (char_length(currency) = 3),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  service_fee numeric(10,2) not null default 0 check (service_fee >= 0),
  total numeric(10,2) not null check (total >= 0),
  -- 'free' and 'test' need no provider; real ones (e.g. 'stripe') come later.
  payment_provider text not null,
  -- The provider's payment/session id, set when the provider confirms.
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal + service_fee)
);

create index if not exists orders_user_id_idx on public.orders (user_id, created_at desc);
create index if not exists orders_event_id_idx on public.orders (event_id);
create unique index if not exists orders_provider_reference_key
  on public.orders (payment_provider, payment_reference)
  where payment_reference is not null;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

alter table public.orders enable row level security;

drop policy if exists "Read own orders, organizers their events, admins all" on public.orders;
create policy "Read own orders, organizers their events, admins all"
  on public.orders for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or public.is_event_owner(event_id)
  );

-- Orders are created by book_ticket and, later, updated by the payment provider.
revoke insert, update, delete on public.orders from anon, authenticated;

-- ---------------------------------------------------------------------------
-- tickets: which order, and the price paid
-- ---------------------------------------------------------------------------
-- Both are null for tickets booked before orders existed.
alter table public.tickets
  add column if not exists order_id uuid references public.orders (id) on delete restrict,
  add column if not exists unit_price numeric(10,2) check (unit_price is null or unit_price >= 0);

create index if not exists tickets_order_id_idx on public.tickets (order_id);

-- ---------------------------------------------------------------------------
-- book_ticket: same checks as before, now creating an order first
-- ---------------------------------------------------------------------------
create or replace function public.book_ticket(p_ticket_type_id uuid, p_quantity integer default 1)
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
  v_sold integer;
  v_mine integer;
  v_subtotal numeric(10,2);
  v_fee numeric(10,2);
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

  select * into v_type from public.ticket_types where id = p_ticket_type_id;
  if not found then
    raise exception 'This ticket type is not available.' using errcode = 'P0002';
  end if;

  -- Lock the event row: bookings for one event are processed one at a time,
  -- so the last seats can't be oversold.
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

  if v_type.quantity is not null then
    select count(*) into v_sold
    from public.tickets
    where ticket_type_id = v_type.id and status in ('active', 'used');

    if v_sold >= v_type.quantity then
      raise exception '% is sold out.', v_type.name using errcode = 'P0001';
    elsif v_sold + p_quantity > v_type.quantity then
      raise exception 'Only % left for %.', v_type.quantity - v_sold, v_type.name using errcode = 'P0001';
    end if;
  end if;

  select count(*) into v_mine
  from public.tickets
  where event_id = v_event.id and user_id = v_user_id and status in ('active', 'used');

  if v_mine >= v_event.max_tickets_per_user then
    raise exception 'You can book at most % tickets for this event.', v_event.max_tickets_per_user
      using errcode = 'P0001';
  elsif v_mine + p_quantity > v_event.max_tickets_per_user then
    raise exception 'You can book % more ticket(s) for this event.', v_event.max_tickets_per_user - v_mine
      using errcode = 'P0001';
  end if;

  -- Price the order. Free orders never pay a fee.
  select * into v_settings from public.payment_settings where id;
  v_subtotal := v_type.price * p_quantity;
  v_fee := case when v_subtotal = 0 then 0
    else round(v_subtotal * coalesce(v_settings.service_fee_percent, 0) / 100, 2) end;

  if v_subtotal + v_fee = 0 then
    v_provider := 'free';
  elsif coalesce(v_settings.mode, 'test') = 'test' then
    -- No payment provider yet: confirm at once without taking money.
    v_provider := 'test';
  else
    raise exception 'Online payment isn''t available yet. Please try again later.' using errcode = 'P0001';
  end if;

  insert into public.orders (user_id, event_id, status, currency, subtotal, service_fee, total, payment_provider, paid_at)
  values (v_user_id, v_event.id, 'paid', coalesce(v_settings.currency, 'SBD'), v_subtotal, v_fee, v_subtotal + v_fee, v_provider, now())
  returning id into v_order_id;

  for seat in 1..p_quantity loop
    -- 12-character random code; retry on the (very unlikely) collision.
    for attempt in 1..5 loop
      begin
        insert into public.tickets (event_id, ticket_type_id, user_id, order_id, unit_price, code)
        values (v_event.id, v_type.id, v_user_id, v_order_id, v_type.price,
                upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)))
        returning * into v_ticket;
        exit;
      exception when unique_violation then
        if attempt = 5 then
          raise;
        end if;
      end;
    end loop;
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

revoke execute on function public.book_ticket(uuid, integer) from public, anon;
grant execute on function public.book_ticket(uuid, integer) to authenticated;
