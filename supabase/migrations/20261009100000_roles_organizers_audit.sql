-- Three-sided platform, part 1: roles, audit log, notification helpers and
-- organizer applications.

-- ---------------------------------------------------------------------------
-- Roles: attendee (default) | organizer (approved via review_organizer) | admin
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'attendee' where role = 'user';
alter table public.profiles alter column role set default 'attendee';
alter table public.profiles
  add constraint profiles_role_check check (role in ('attendee', 'organizer', 'admin'));
-- guard_profile_role (existing trigger) still blocks anyone but an admin from
-- changing a role; the approval RPC runs as the reviewing admin.

-- ---------------------------------------------------------------------------
-- Audit log: written only by the review/approval functions, read by admins.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_target_idx on public.audit_log (target_type, target_id);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id);

alter table public.audit_log enable row level security;

create policy "Admins read the audit log"
  on public.audit_log for select to authenticated
  using ((select public.is_admin()));

revoke insert, update, delete on public.audit_log from anon, authenticated;

create or replace function public.write_audit(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- Notification helpers (internal; called by other functions only)
-- ---------------------------------------------------------------------------
create or replace function public.notify_user(p_user_id uuid, p_title text, p_body text, p_link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, body, link)
  select p_user_id, left(p_title, 120), left(p_body, 1000), p_link
  where p_user_id is not null;
$$;

create or replace function public.notify_admins(p_title text, p_body text, p_link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, body, link)
  select p.id, left(p_title, 120), left(p_body, 1000), p_link
  from public.profiles p
  where p.role = 'admin';
$$;

revoke execute on function public.write_audit(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_user(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Organizer profiles (applications)
-- ---------------------------------------------------------------------------
create table if not exists public.organizer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  organization_name text not null check (char_length(trim(organization_name)) between 2 and 120),
  phone text check (phone is null or char_length(phone) <= 40),
  city text check (city is null or char_length(city) <= 80),
  website text check (website is null or (char_length(website) <= 300 and website ~* '^https?://')),
  event_types text[] not null default '{}' check (cardinality(event_types) <= 20),
  description text check (description is null or char_length(description) <= 2000),
  logo_path text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists organizer_profiles_status_idx on public.organizer_profiles (status, created_at desc);
create index if not exists organizer_profiles_reviewed_by_idx on public.organizer_profiles (reviewed_by);

drop trigger if exists set_organizer_profiles_updated_at on public.organizer_profiles;
create trigger set_organizer_profiles_updated_at
  before update on public.organizer_profiles
  for each row execute procedure public.set_updated_at();

alter table public.organizer_profiles enable row level security;

-- Owners see their own application; admins see all. Public organizer info
-- is served by get_public_organizers() so private fields (phone) stay private.
create policy "Owner or admin reads organizer profile"
  on public.organizer_profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Owners edit their application only while it is pending; admins any time.
create policy "Owner edits pending application, admins edit all"
  on public.organizer_profiles for update to authenticated
  using ((user_id = (select auth.uid()) and status = 'pending') or (select public.is_admin()))
  with check ((user_id = (select auth.uid()) and status = 'pending') or (select public.is_admin()));

-- Rows are created by apply_as_organizer(); status/review fields change only
-- through review_organizer().
revoke insert, delete on public.organizer_profiles from anon, authenticated;
revoke update on public.organizer_profiles from anon, authenticated;
grant update (organization_name, phone, city, website, event_types, description, logo_path)
  on public.organizer_profiles to authenticated;

create or replace function public.is_approved_organizer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organizer_profiles
    where user_id = (select auth.uid()) and status = 'approved'
  );
$$;

revoke execute on function public.is_approved_organizer() from public, anon;
grant execute on function public.is_approved_organizer() to authenticated;

-- Public organizer info for "Hosted by" and organizer pages. Suspended
-- organizers are included so their still-published events show a host.
create or replace function public.get_public_organizers(p_user_ids uuid[])
returns table (
  user_id uuid,
  organization_name text,
  logo_path text,
  description text,
  website text,
  city text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.user_id, o.organization_name, o.logo_path, o.description, o.website, o.city, o.status
  from public.organizer_profiles o
  where o.user_id = any(p_user_ids) and o.status in ('approved', 'suspended');
$$;

revoke execute on function public.get_public_organizers(uuid[]) from public;
grant execute on function public.get_public_organizers(uuid[]) to anon, authenticated;

-- Apply (or re-apply after a rejection). Editing a pending application also
-- goes through here.
create or replace function public.apply_as_organizer(
  p_organization_name text,
  p_phone text default null,
  p_city text default null,
  p_website text default null,
  p_event_types text[] default '{}',
  p_description text default null,
  p_logo_path text default null
)
returns public.organizer_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.organizer_profiles%rowtype;
  v_result public.organizer_profiles%rowtype;
  v_logo text := nullif(trim(coalesce(p_logo_path, '')), '');
begin
  if v_user_id is null then
    raise exception 'Please sign in to apply.' using errcode = '28000';
  end if;

  -- Logos must be uploaded to the applicant's own folder.
  if v_logo is not null and v_logo not like v_user_id::text || '/%' then
    raise exception 'Upload the logo to your own folder.' using errcode = '42501';
  end if;

  select * into v_existing from public.organizer_profiles where user_id = v_user_id for update;

  if found then
    if v_existing.status = 'approved' then
      raise exception 'Your organizer account is already approved.' using errcode = 'P0001';
    elsif v_existing.status = 'suspended' then
      raise exception 'Your organizer account is suspended. Please contact support.' using errcode = 'P0001';
    end if;

    update public.organizer_profiles
    set organization_name = trim(p_organization_name),
        phone = nullif(trim(coalesce(p_phone, '')), ''),
        city = nullif(trim(coalesce(p_city, '')), ''),
        website = nullif(trim(coalesce(p_website, '')), ''),
        event_types = coalesce(p_event_types, '{}'),
        description = nullif(trim(coalesce(p_description, '')), ''),
        logo_path = v_logo,
        status = 'pending',
        review_note = case when v_existing.status = 'rejected' then null else review_note end,
        reviewed_by = case when v_existing.status = 'rejected' then null else reviewed_by end,
        reviewed_at = case when v_existing.status = 'rejected' then null else reviewed_at end
    where user_id = v_user_id
    returning * into v_result;
  else
    insert into public.organizer_profiles
      (user_id, organization_name, phone, city, website, event_types, description, logo_path)
    values (
      v_user_id,
      trim(p_organization_name),
      nullif(trim(coalesce(p_phone, '')), ''),
      nullif(trim(coalesce(p_city, '')), ''),
      nullif(trim(coalesce(p_website, '')), ''),
      coalesce(p_event_types, '{}'),
      nullif(trim(coalesce(p_description, '')), ''),
      v_logo
    )
    returning * into v_result;
  end if;

  if v_existing.user_id is null or v_existing.status = 'rejected' then
    perform public.notify_admins(
      'New organizer application',
      format('%s applied to host events.', v_result.organization_name),
      '/admin/organizers'
    );
  end if;

  perform public.write_audit(
    case when v_existing.user_id is null then 'organizer.applied'
         when v_existing.status = 'rejected' then 'organizer.reapplied'
         else 'organizer.application_updated' end,
    'organizer', v_user_id::text,
    jsonb_build_object('organization_name', v_result.organization_name)
  );

  return v_result;
end;
$$;

-- Admin decision on an organizer: approve | reject | suspend.
create or replace function public.review_organizer(p_user_id uuid, p_decision text, p_note text default null)
returns public.organizer_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.organizer_profiles%rowtype;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_new_status text;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  select * into v_profile from public.organizer_profiles where user_id = p_user_id for update;
  if not found then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;

  if p_decision = 'approve' then
    if v_profile.status = 'approved' then
      raise exception 'This organizer is already approved.' using errcode = 'P0001';
    end if;
    v_new_status := 'approved';
  elsif p_decision = 'reject' then
    if v_profile.status <> 'pending' then
      raise exception 'Only pending applications can be rejected.' using errcode = 'P0001';
    end if;
    if v_note is null then
      raise exception 'Give a reason for the rejection.' using errcode = 'P0001';
    end if;
    v_new_status := 'rejected';
  elsif p_decision = 'suspend' then
    if v_profile.status <> 'approved' then
      raise exception 'Only approved organizers can be suspended.' using errcode = 'P0001';
    end if;
    if v_note is null then
      raise exception 'Give a reason for the suspension.' using errcode = 'P0001';
    end if;
    v_new_status := 'suspended';
  else
    raise exception 'Decision must be approve, reject or suspend.' using errcode = '22023';
  end if;

  update public.organizer_profiles
  set status = v_new_status,
      review_note = v_note,
      reviewed_by = auth.uid(),
      reviewed_at = timezone('utc', now())
  where user_id = p_user_id
  returning * into v_profile;

  -- Approval upgrades attendees; admins keep their admin role.
  if v_new_status = 'approved' then
    update public.profiles set role = 'organizer' where id = p_user_id and role = 'attendee';
  end if;

  perform public.notify_user(
    p_user_id,
    case v_new_status
      when 'approved' then 'Your organizer account is approved'
      when 'rejected' then 'Your organizer application was not approved'
      else 'Your organizer account is suspended'
    end,
    coalesce(v_note, case v_new_status when 'approved' then 'You can now create events.' else null end),
    case v_new_status when 'approved' then '/manager' else '/manager/application' end
  );

  perform public.write_audit(
    'organizer.' || p_decision, 'organizer', p_user_id::text,
    jsonb_build_object('note', v_note, 'organization_name', v_profile.organization_name)
  );

  return v_profile;
end;
$$;

revoke execute on function public.apply_as_organizer(text, text, text, text, text[], text, text) from public, anon;
revoke execute on function public.review_organizer(uuid, text, text) from public, anon;
grant execute on function public.apply_as_organizer(text, text, text, text, text[], text, text) to authenticated;
grant execute on function public.review_organizer(uuid, text, text) to authenticated;
