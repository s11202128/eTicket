-- Three-sided platform, part 3: ticket types, booking by ticket type,
-- check-in per event, and organizer access to their own attendees.

-- ---------------------------------------------------------------------------
-- Ticket types
-- ---------------------------------------------------------------------------
create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  description text check (description is null or char_length(description) <= 300),
  price numeric(10, 2) not null default 0 check (price >= 0),
  -- null = unlimited
  quantity integer check (quantity is null or quantity > 0),
  sales_start timestamptz,
  sales_end timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ticket_types_sales_window check (sales_start is null or sales_end is null or sales_end > sales_start),
  constraint ticket_types_unique_name unique (event_id, name)
);

create index if not exists ticket_types_event_idx on public.ticket_types (event_id, sort_order);

drop trigger if exists set_ticket_types_updated_at on public.ticket_types;
create trigger set_ticket_types_updated_at
  before update on public.ticket_types
  for each row execute procedure public.set_updated_at();

-- Existing events: one "General Admission" type from the event's price/capacity.
insert into public.ticket_types (event_id, name, price, quantity, sort_order)
select e.id, 'General Admission', e.price, e.capacity, 0
from public.events e
where not exists (select 1 from public.ticket_types t where t.event_id = e.id);

alter table public.tickets
  add column if not exists ticket_type_id uuid references public.ticket_types(id) on delete restrict;

update public.tickets t
set ticket_type_id = tt.id
from public.ticket_types tt
where t.ticket_type_id is null and tt.event_id = t.event_id and tt.name = 'General Admission';

alter table public.tickets alter column ticket_type_id set not null;
create index if not exists tickets_ticket_type_status_idx on public.tickets (ticket_type_id, status);

-- events.price ("from" price) and events.capacity (total seats, null when any
-- type is unlimited) are summaries kept in sync from ticket types.
create or replace function public.refresh_event_ticket_summary(p_event_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.events e
  set price = coalesce((select min(t.price) from public.ticket_types t where t.event_id = p_event_id), 0),
      capacity = (
        select case when count(*) = 0 or bool_or(t.quantity is null) then null else sum(t.quantity)::integer end
        from public.ticket_types t
        where t.event_id = p_event_id
      )
  where e.id = p_event_id;
$$;

create or replace function public.ticket_types_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only price/capacity change here, which the event column guard allows.
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_event_ticket_summary(new.event_id);
  end if;
  if tg_op in ('DELETE', 'UPDATE') and (tg_op = 'DELETE' or old.event_id <> new.event_id) then
    perform public.refresh_event_ticket_summary(old.event_id);
  end if;
  return null;
end;
$$;

-- Quantity can't drop below tickets already sold (active + used).
create or replace function public.ticket_types_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sold integer;
begin
  if new.quantity is not null and (old.quantity is null or new.quantity < old.quantity) then
    select count(*) into v_sold
    from public.tickets
    where ticket_type_id = new.id and status in ('active', 'used');
    if new.quantity < v_sold then
      raise exception 'Quantity for "%" can''t be lower than the % tickets already sold.', new.name, v_sold
        using errcode = 'P0001';
    end if;
  end if;
  if new.event_id <> old.event_id then
    raise exception 'A ticket type can''t be moved to another event.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.refresh_event_ticket_summary(uuid) from public, anon, authenticated;
revoke execute on function public.ticket_types_after_change() from public, anon, authenticated;
revoke execute on function public.ticket_types_before_update() from public, anon, authenticated;

drop trigger if exists ticket_types_after_change on public.ticket_types;
create trigger ticket_types_after_change
  after insert or update or delete on public.ticket_types
  for each row execute procedure public.ticket_types_after_change();

drop trigger if exists ticket_types_before_update on public.ticket_types;
create trigger ticket_types_before_update
  before update on public.ticket_types
  for each row execute procedure public.ticket_types_before_update();

alter table public.ticket_types enable row level security;

-- Visible whenever the event itself is visible to the reader (events RLS applies).
create policy "Ticket types follow event visibility"
  on public.ticket_types for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = ticket_types.event_id));

create policy "Admins and owners of editable events add ticket types"
  on public.ticket_types for insert to authenticated
  with check ((select public.is_admin()) or public.owner_can_edit_event(event_id));

create policy "Admins and owners of editable events update ticket types"
  on public.ticket_types for update to authenticated
  using ((select public.is_admin()) or public.owner_can_edit_event(event_id))
  with check ((select public.is_admin()) or public.owner_can_edit_event(event_id));

create policy "Admins and owners of editable events delete ticket types"
  on public.ticket_types for delete to authenticated
  using ((select public.is_admin()) or public.owner_can_edit_event(event_id));

revoke insert, update, delete on public.ticket_types from anon;

-- Seats taken per ticket type (for "Sold out" / "Only X left").
create or replace function public.get_ticket_type_counts(p_event_ids uuid[])
returns table (ticket_type_id uuid, sold integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.ticket_type_id, count(*)::integer
  from public.tickets t
  join public.events e on e.id = t.event_id
  where t.event_id = any(p_event_ids)
    and t.status in ('active', 'used')
    and (e.status in ('published', 'completed') or public.is_admin() or e.organizer_id = auth.uid())
  group by t.ticket_type_id;
$$;

revoke execute on function public.get_ticket_type_counts(uuid[]) from public;
grant execute on function public.get_ticket_type_counts(uuid[]) to anon, authenticated;

-- Event-level counts: same visibility rules (now including completed events
-- and the organizer's own events).
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
    and (e.status in ('published', 'completed') or public.is_admin() or e.organizer_id = auth.uid())
  group by t.event_id;
$$;

-- ---------------------------------------------------------------------------
-- Tickets: organizers read tickets for their own events
-- ---------------------------------------------------------------------------
drop policy if exists "Read own tickets, admins read all" on public.tickets;

create policy "Read own tickets, organizers their events, admins all"
  on public.tickets for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or public.is_event_owner(event_id)
  );

-- Attendee list with holder name/email for the event's organizer and admins.
create or replace function public.list_event_attendees(p_event_id uuid)
returns table (
  ticket_id uuid,
  code text,
  status text,
  booked_at timestamptz,
  checked_in_at timestamptz,
  ticket_type_id uuid,
  ticket_type_name text,
  holder_name text,
  holder_email text
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
    select t.id, t.code, t.status, t.created_at, t.checked_in_at, tt.id, tt.name, p.full_name, p.email
    from public.tickets t
    join public.ticket_types tt on tt.id = t.ticket_type_id
    left join public.profiles p on p.id = t.user_id
    where t.event_id = p_event_id
    order by t.created_at desc;
end;
$$;

revoke execute on function public.list_event_attendees(uuid) from public, anon;
grant execute on function public.list_event_attendees(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- book_ticket(ticket_type_id, quantity): one ticket row per seat
-- ---------------------------------------------------------------------------
drop function if exists public.book_ticket(uuid);

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
  v_sold integer;
  v_mine integer;
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

  for seat in 1..p_quantity loop
    -- 12-character random code; retry on the (very unlikely) collision.
    for attempt in 1..5 loop
      begin
        insert into public.tickets (event_id, ticket_type_id, user_id, code)
        values (v_event.id, v_type.id, v_user_id, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)))
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

-- ---------------------------------------------------------------------------
-- check_in_ticket(code, event_id)
--   result: valid | already_used | cancelled | wrong_event | wrong_date | not_found
--   With an event: admins, its organizer, or its door staff.
--   Without an event (admin scanner): admins only.
-- ---------------------------------------------------------------------------
drop function if exists public.check_in_ticket(text);

create or replace function public.check_in_ticket(p_code text, p_event_id uuid default null)
returns table (
  result text,
  ticket_id uuid,
  code text,
  status text,
  event_id uuid,
  event_title text,
  starts_at timestamptz,
  holder_name text,
  checked_in_at timestamptz,
  ticket_type_name text
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

  -- A ticket for another event: reveal nothing about it.
  if p_event_id is not null and v_ticket.event_id <> p_event_id then
    return query select 'wrong_event'::text, null::uuid, v_code, null::text, null::uuid,
      null::text, null::timestamptz, null::text, null::timestamptz, null::text;
    return;
  end if;

  select * into v_event from public.events e where e.id = v_ticket.event_id;
  select tt.name into v_type_name from public.ticket_types tt where tt.id = v_ticket.ticket_type_id;
  select coalesce(nullif(trim(p.full_name), ''), p.email, 'Guest') into v_holder
  from public.profiles p where p.id = v_ticket.user_id;

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

revoke execute on function public.check_in_ticket(text, uuid) from public, anon;
grant execute on function public.check_in_ticket(text, uuid) to authenticated;
