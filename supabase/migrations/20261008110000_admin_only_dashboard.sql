-- The admin dashboard, including ticket check-in, is for admins only.
-- The 'staff' role is retired: any staff accounts become regular users.

update public.profiles set role = 'user' where role = 'staff';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

-- Check-in: admins only (was staff or admin).
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
  if not public.is_admin() then
    raise exception 'Only admins can check in tickets.' using errcode = '42501';
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

-- No longer used anywhere.
drop function if exists public.is_staff_or_admin();
