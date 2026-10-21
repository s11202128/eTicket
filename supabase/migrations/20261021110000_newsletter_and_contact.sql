-- Newsletter sign-ups and the contact form.
--
-- Both are written only through functions that anyone (signed in or not) may
-- call; the tables themselves accept no direct writes. Admins read them in
-- the dashboard.

-- ---------------------------------------------------------------------------
-- newsletter_subscribers
-- ---------------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  -- Stored lower-cased and trimmed, so each address is listed once.
  email text not null unique
    check (email = lower(trim(email)) and char_length(email) between 3 and 254),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Admins read newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins read newsletter subscribers"
  on public.newsletter_subscribers for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins remove newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins remove newsletter subscribers"
  on public.newsletter_subscribers for delete to authenticated
  using ((select public.is_admin()));

-- Sign-ups go through subscribe_newsletter only.
revoke insert, update on public.newsletter_subscribers from anon, authenticated;
revoke delete on public.newsletter_subscribers from anon;

-- ---------------------------------------------------------------------------
-- subscribe_newsletter: adds an address. Subscribing twice is silently fine,
-- so the result never reveals whether someone is already on the list.
-- ---------------------------------------------------------------------------
create or replace function public.subscribe_newsletter(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;

  insert into public.newsletter_subscribers (email)
  values (v_email)
  on conflict (email) do nothing;
end;
$$;

revoke execute on function public.subscribe_newsletter(text) from public;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- contact_messages
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (email = lower(trim(email)) and char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 1 and 4000),
  created_at timestamptz not null default timezone('utc', now()),
  -- Set when an admin marks the message as dealt with (null = open).
  handled_at timestamptz,
  handled_by uuid references auth.users(id) on delete set null
);

-- Newest first in the inbox; per-email lookups for the rate limit.
create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);
create index if not exists contact_messages_email_idx
  on public.contact_messages (email, created_at desc);
create index if not exists contact_messages_handled_by_idx
  on public.contact_messages (handled_by);

alter table public.contact_messages enable row level security;

drop policy if exists "Admins read contact messages" on public.contact_messages;
create policy "Admins read contact messages"
  on public.contact_messages for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins update contact messages" on public.contact_messages;
create policy "Admins update contact messages"
  on public.contact_messages for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Messages are sent through submit_contact_message only. Admins may only
-- change handled_at; handled_by is filled in by the trigger below.
revoke insert, update, delete on public.contact_messages from anon, authenticated;
grant update (handled_at) on public.contact_messages to authenticated;

-- Records who marked the message handled (cleared again when reopened).
create or replace function public.set_contact_message_handled_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.handled_at is distinct from old.handled_at then
    new.handled_by := case when new.handled_at is null then null else auth.uid() end;
  end if;
  return new;
end;
$$;

revoke execute on function public.set_contact_message_handled_by() from public, anon, authenticated;

drop trigger if exists set_contact_message_handled_by on public.contact_messages;
create trigger set_contact_message_handled_by
  before update on public.contact_messages
  for each row execute procedure public.set_contact_message_handled_by();

-- ---------------------------------------------------------------------------
-- submit_contact_message: validates, limits each address to 3 messages an
-- hour, stores the message and tells the admins.
-- ---------------------------------------------------------------------------
create or replace function public.submit_contact_message(p_name text, p_email text, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_message text := trim(coalesce(p_message, ''));
  v_recent integer;
begin
  if char_length(v_name) < 1 or char_length(v_name) > 100 then
    raise exception 'Enter your name (up to 100 characters).' using errcode = '22023';
  end if;

  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;

  if char_length(v_message) < 1 or char_length(v_message) > 4000 then
    raise exception 'Enter a message (up to 4000 characters).' using errcode = '22023';
  end if;

  -- One sender at a time, so parallel requests can't slip past the limit.
  perform pg_advisory_xact_lock(hashtext('contact_messages:' || v_email));

  select count(*) into v_recent
  from public.contact_messages
  where email = v_email and created_at > timezone('utc', now()) - interval '1 hour';

  if v_recent >= 3 then
    raise exception 'You''ve sent a few messages already. Please wait an hour before sending another.'
      using errcode = 'P0001';
  end if;

  insert into public.contact_messages (name, email, message)
  values (v_name, v_email, v_message);

  perform public.notify_admins(
    'New contact message',
    format('%s (%s): %s', v_name, v_email, left(v_message, 200)),
    '/admin/messages'
  );
end;
$$;

revoke execute on function public.submit_contact_message(text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text) to anon, authenticated;
