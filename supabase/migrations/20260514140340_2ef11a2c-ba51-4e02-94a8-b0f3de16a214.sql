
revoke execute on function public.has_role(uuid, app_role) from public, anon;
revoke execute on function public.is_period_open(uuid) from public, anon;
revoke execute on function public.set_updated_at() from public, anon;
revoke execute on function public.handle_new_user() from public, anon;
grant execute on function public.has_role(uuid, app_role) to authenticated;
grant execute on function public.is_period_open(uuid) to authenticated;
