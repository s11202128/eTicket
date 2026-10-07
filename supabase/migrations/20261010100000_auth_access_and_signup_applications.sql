-- Phase 2 (auth experience):
-- 1. get_my_access(): one call that tells the route guard and the login
--    redirect who the signed-in user is (role, organizer status, door staff).
-- 2. Organizer applications submitted on the signup form are created as soon
--    as the account exists, even before the email is confirmed.

create or replace function public.get_my_access()
returns table (role text, organizer_status text, staff_event_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.role,
    o.status,
    (select count(*)::integer from public.event_staff s where s.user_id = p.id)
  from public.profiles p
  left join public.organizer_profiles o on o.user_id = p.id
  where p.id = (select auth.uid());
$$;

revoke execute on function public.get_my_access() from public, anon;
grant execute on function public.get_my_access() to authenticated;

-- Signup stores the organizer form in user metadata ("organizer_application");
-- turn it into a pending application. Never blocks the signup itself.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app jsonb := new.raw_user_meta_data->'organizer_application';
  v_name text;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  if jsonb_typeof(v_app) = 'object' then
    begin
      v_name := trim(coalesce(v_app->>'organization_name', ''));
      insert into public.organizer_profiles
        (user_id, organization_name, phone, city, website, event_types, description)
      values (
        new.id,
        v_name,
        nullif(trim(coalesce(v_app->>'phone', '')), ''),
        nullif(trim(coalesce(v_app->>'city', '')), ''),
        nullif(trim(coalesce(v_app->>'website', '')), ''),
        coalesce(
          (select array_agg(left(value, 60)) from jsonb_array_elements_text(
            case when jsonb_typeof(v_app->'event_types') = 'array' then v_app->'event_types' else '[]'::jsonb end
          ) as value),
          '{}'
        ),
        nullif(trim(coalesce(v_app->>'description', '')), '')
      )
      on conflict (user_id) do nothing;

      perform public.notify_admins(
        'New organizer application',
        format('%s applied to host events.', v_name),
        '/admin/organizers'
      );
      insert into public.audit_log (actor_id, action, target_type, target_id, details)
      values (new.id, 'organizer.applied', 'organizer', new.id::text,
        jsonb_build_object('organization_name', v_name, 'source', 'signup'));
    exception when others then
      -- Invalid details (e.g. a too-short name): the account is still created
      -- and the person can apply again from /manager/application.
      null;
    end;
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
