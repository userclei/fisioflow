
revoke execute on function public.is_workspace_member(uuid, uuid) from public, anon;
revoke execute on function public.has_workspace_role(uuid, uuid, public.app_role) from public, anon;
revoke execute on function public.is_workspace_admin(uuid, uuid) from public, anon;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.is_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, uuid, public.app_role) to authenticated;
grant execute on function public.is_workspace_admin(uuid, uuid) to authenticated;
