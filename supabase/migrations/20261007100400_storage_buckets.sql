-- Public image buckets. Anyone can view files by URL; only admins write
-- event and site images, and each user writes only their own avatar folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-images', 'event-images', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('site-images', 'site-images', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 2097152,
    array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Admin-managed buckets.
create policy "Admins read event and site images"
  on storage.objects
  for select
  to authenticated
  using (bucket_id in ('event-images', 'site-images') and (select public.is_admin()));

create policy "Admins upload event and site images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id in ('event-images', 'site-images') and (select public.is_admin()));

create policy "Admins update event and site images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id in ('event-images', 'site-images') and (select public.is_admin()))
  with check (bucket_id in ('event-images', 'site-images') and (select public.is_admin()));

create policy "Admins delete event and site images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id in ('event-images', 'site-images') and (select public.is_admin()));

-- Avatars: files live under "<user id>/...".
create policy "Users read own avatar files"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users upload own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users update own avatar"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete own avatar"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
