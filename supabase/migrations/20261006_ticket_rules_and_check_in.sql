-- Optional seat limit per event (null = unlimited).
alter table public.events
  add column if not exists capacity integer check (capacity is null or capacity > 0);

-- A user can hold only one active ticket per event.
create unique index if not exists tickets_one_active_per_user_event
  on public.tickets (event_id, user_id)
  where status = 'active';

-- Reject bookings for events that have started or are full. Runs as the
-- table owner so it can count every user's tickets, not just the caller's.
create or replace function public.check_ticket_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_booked integer;
begin
  -- Lock the event row so concurrent bookings can't oversell it.
  select * into v_event from public.events where id = new.event_id for update;

  if not found then
    raise exception 'Event not found.';
  end if;

  if v_event.starts_at < now() then
    raise exception 'This event has already started.';
  end if;

  if v_event.capacity is not null then
    select count(*) into v_booked
    from public.tickets
    where event_id = new.event_id and status <> 'cancelled';

    if v_booked >= v_event.capacity then
      raise exception 'This event is sold out.';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.check_ticket_booking() from public, anon, authenticated;

drop trigger if exists check_ticket_booking on public.tickets;

create trigger check_ticket_booking
  before insert on public.tickets
  for each row execute procedure public.check_ticket_booking();

-- Users may cancel their own active tickets, and change nothing else.
revoke update on public.tickets from anon, authenticated;
grant update (status) on public.tickets to authenticated;

create policy "Users can cancel own active tickets"
  on public.tickets
  for update
  to authenticated
  using ((select auth.uid()) = user_id and status = 'active')
  with check ((select auth.uid()) = user_id and status = 'cancelled');

-- Users may edit only their name and avatar, never their role.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- Booked seat counts per event, for showing availability to everyone.
create or replace function public.get_event_booked_counts(event_ids uuid[])
returns table (event_id uuid, booked integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.event_id, count(*)::integer
  from public.tickets t
  where t.event_id = any(event_ids) and t.status <> 'cancelled'
  group by t.event_id;
$$;

revoke execute on function public.get_event_booked_counts(uuid[]) from public;
grant execute on function public.get_event_booked_counts(uuid[]) to anon, authenticated;

-- Door check-in: the event's organizer marks a ticket as used by its code.
create or replace function public.redeem_ticket(ticket_code text)
returns table (ticket_id uuid, event_title text, holder_email text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets%rowtype;
  v_event public.events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select * into v_ticket
  from public.tickets
  where code = upper(trim(ticket_code))
  for update;

  if not found then
    raise exception 'Ticket not found.';
  end if;

  select * into v_event from public.events where id = v_ticket.event_id;

  if v_event.created_by <> auth.uid() then
    raise exception 'Only the event organizer can check in this ticket.';
  end if;

  if v_ticket.status = 'used' then
    raise exception 'This ticket has already been used.';
  end if;

  if v_ticket.status = 'cancelled' then
    raise exception 'This ticket was cancelled.';
  end if;

  update public.tickets set status = 'used' where id = v_ticket.id;

  return query
    select v_ticket.id, v_event.title, p.email
    from (select 1) as one
    left join public.profiles p on p.id = v_ticket.user_id;
end;
$$;

revoke execute on function public.redeem_ticket(text) from public, anon;
grant execute on function public.redeem_ticket(text) to authenticated;
