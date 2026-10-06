-- handle_new_user() only runs as the auth.users trigger; it should not be
-- callable through the API (/rest/v1/rpc/handle_new_user).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
