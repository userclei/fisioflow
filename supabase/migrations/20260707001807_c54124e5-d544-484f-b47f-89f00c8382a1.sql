
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_workspace_member(_user_id uuid, _workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where user_id = _user_id and workspace_id = _workspace_id and status = 'active'
  );
$$;

create or replace function private.is_workspace_admin(_user_id uuid, _workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where user_id = _user_id and workspace_id = _workspace_id
      and role in ('admin','super_admin') and status = 'active'
  );
$$;

create or replace function private.has_workspace_role(_user_id uuid, _workspace_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where user_id = _user_id and workspace_id = _workspace_id and role = _role and status = 'active'
  );
$$;

-- Drop then recreate every policy that referenced public.is_workspace_member/is_workspace_admin
-- Simpler: replace the public functions to just delegate; grant EXECUTE to authenticated stays but they add no info because private ones exist.
-- Cleanest: drop policies, recreate against private.*
drop policy if exists workspaces_member_select on public.workspaces;
drop policy if exists workspaces_admin_update on public.workspaces;
drop policy if exists wsm_self_select on public.workspace_members;
drop policy if exists wsm_self_insert on public.workspace_members;
drop policy if exists wsm_admin_update on public.workspace_members;
drop policy if exists wsm_admin_delete on public.workspace_members;
drop policy if exists audit_ws_select on public.audit_logs;
drop policy if exists audit_ws_insert on public.audit_logs;
drop policy if exists dict_read on public.dictionary_terms;
drop policy if exists dict_insert on public.dictionary_terms;
drop policy if exists dict_update on public.dictionary_terms;
drop policy if exists dict_delete on public.dictionary_terms;
drop policy if exists epi_select on public.exercise_prescription_items;
drop policy if exists epi_write on public.exercise_prescription_items;

do $$
declare t text; p text;
begin
  foreach t in array array[
    'patients','appointments','clinical_notes','exercises','exercise_prescriptions',
    'charges','tasks','notifications','tool_records','user_settings','subscriptions'
  ] loop
    foreach p in array array['_ws_select','_ws_insert','_ws_update','_ws_delete'] loop
      execute format('drop policy if exists %I on public.%I;', t||p, t);
    end loop;
  end loop;
end$$;

-- Recreate against private.*
create policy workspaces_member_select on public.workspaces for select to authenticated
  using (private.is_workspace_member(auth.uid(), id));
create policy workspaces_admin_update on public.workspaces for update to authenticated
  using (private.is_workspace_admin(auth.uid(), id))
  with check (private.is_workspace_admin(auth.uid(), id));

create policy wsm_self_select on public.workspace_members for select to authenticated
  using (user_id = auth.uid() or private.is_workspace_admin(auth.uid(), workspace_id));
create policy wsm_self_insert on public.workspace_members for insert to authenticated
  with check (user_id = auth.uid() or private.is_workspace_admin(auth.uid(), workspace_id));
create policy wsm_admin_update on public.workspace_members for update to authenticated
  using (private.is_workspace_admin(auth.uid(), workspace_id));
create policy wsm_admin_delete on public.workspace_members for delete to authenticated
  using (private.is_workspace_admin(auth.uid(), workspace_id));

create policy audit_ws_select on public.audit_logs for select to authenticated
  using (private.is_workspace_member(auth.uid(), workspace_id));
create policy audit_ws_insert on public.audit_logs for insert to authenticated
  with check (private.is_workspace_member(auth.uid(), workspace_id));

create policy dict_read on public.dictionary_terms for select to authenticated
  using (is_global or (workspace_id is not null and private.is_workspace_member(auth.uid(), workspace_id)));
create policy dict_insert on public.dictionary_terms for insert to authenticated
  with check (workspace_id is not null and private.is_workspace_member(auth.uid(), workspace_id));
create policy dict_update on public.dictionary_terms for update to authenticated
  using (workspace_id is not null and private.is_workspace_member(auth.uid(), workspace_id))
  with check (workspace_id is not null and private.is_workspace_member(auth.uid(), workspace_id));
create policy dict_delete on public.dictionary_terms for delete to authenticated
  using (workspace_id is not null and private.is_workspace_member(auth.uid(), workspace_id));

create policy epi_select on public.exercise_prescription_items for select to authenticated using (
  exists (select 1 from public.exercise_prescriptions p
          where p.id = prescription_id and private.is_workspace_member(auth.uid(), p.workspace_id))
);
create policy epi_write on public.exercise_prescription_items for all to authenticated
  using (exists (select 1 from public.exercise_prescriptions p where p.id = prescription_id and private.is_workspace_member(auth.uid(), p.workspace_id)))
  with check (exists (select 1 from public.exercise_prescriptions p where p.id = prescription_id and private.is_workspace_member(auth.uid(), p.workspace_id)));

do $$
declare t text;
begin
  foreach t in array array[
    'patients','appointments','clinical_notes','exercises','exercise_prescriptions',
    'charges','tasks','notifications','tool_records','user_settings','subscriptions'
  ] loop
    execute format($p$create policy %I on public.%I for select to authenticated using (private.is_workspace_member(auth.uid(), workspace_id));$p$, t||'_ws_select', t);
    execute format($p$create policy %I on public.%I for insert to authenticated with check (private.is_workspace_member(auth.uid(), workspace_id));$p$, t||'_ws_insert', t);
    execute format($p$create policy %I on public.%I for update to authenticated using (private.is_workspace_member(auth.uid(), workspace_id)) with check (private.is_workspace_member(auth.uid(), workspace_id));$p$, t||'_ws_update', t);
    execute format($p$create policy %I on public.%I for delete to authenticated using (private.is_workspace_member(auth.uid(), workspace_id));$p$, t||'_ws_delete', t);
  end loop;
end$$;

-- Now safely drop the public helper functions
drop function if exists public.is_workspace_member(uuid, uuid);
drop function if exists public.is_workspace_admin(uuid, uuid);
drop function if exists public.has_workspace_role(uuid, uuid, public.app_role);
