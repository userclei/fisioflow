
-- ==================== ENUMS ====================
create type public.app_role as enum ('super_admin','admin','physiotherapist','assistant');
create type public.workspace_type as enum ('individual','clinic','sandbox');
create type public.workspace_status as enum ('active','trial','blocked','cancelled');
create type public.plan_kind as enum ('free','pro_monthly','pro_yearly');
create type public.member_status as enum ('active','invited','disabled');
create type public.patient_status as enum ('active','inactive');
create type public.appointment_status as enum ('scheduled','completed','cancelled','missed');
create type public.appointment_type as enum ('avaliacao','sessao','retorno','outro');
create type public.charge_status as enum ('pending','paid','overdue','cancelled');
create type public.task_priority as enum ('low','medium','high');
create type public.task_status as enum ('pending','completed','cancelled');
create type public.note_category as enum ('avaliacao','evolucao','observacao','retorno','outro');
create type public.note_visibility as enum ('private','workspace');
create type public.theme_pref as enum ('automatic','light','dark');
create type public.use_mode as enum ('professional','clinic');

-- ==================== TABLES: identity ====================
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.workspace_type not null default 'individual',
  owner_id uuid not null,
  plan public.plan_kind not null default 'free',
  status public.workspace_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default 'Usuário',
  email text,
  phone text,
  avatar_url text,
  professional_register text,
  default_workspace_id uuid references public.workspaces(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'physiotherapist',
  status public.member_status not null default 'active',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- Owner FK deferred until workspaces + auth users exist. auth.users is managed by Supabase.
alter table public.workspaces
  add constraint workspaces_owner_fk foreign key (owner_id) references auth.users(id) on delete cascade;

-- ==================== HELPER FUNCTIONS (SECURITY DEFINER, no recursion) ====================
create or replace function public.is_workspace_member(_user_id uuid, _workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where user_id = _user_id and workspace_id = _workspace_id and status = 'active'
  );
$$;

create or replace function public.has_workspace_role(_user_id uuid, _workspace_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where user_id = _user_id and workspace_id = _workspace_id and role = _role and status = 'active'
  );
$$;

create or replace function public.is_workspace_admin(_user_id uuid, _workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where user_id = _user_id and workspace_id = _workspace_id
      and role in ('admin','super_admin') and status = 'active'
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- ==================== DOMAIN TABLES ====================
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  full_name text not null,
  phone text, whatsapp text, email text,
  birth_date date, cpf text,
  gender text,
  status public.patient_status not null default 'active',
  treatment_goal text, observations text,
  emergency_contact_name text, emergency_contact_phone text,
  created_by uuid not null references auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index patients_ws_idx on public.patients(workspace_id) where deleted_at is null;
create index patients_search_idx on public.patients using gin (to_tsvector('portuguese', coalesce(full_name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(phone,'') || ' ' || coalesce(cpf,'')));

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  professional_id uuid not null references auth.users(id),
  title text not null default 'Atendimento',
  type public.appointment_type not null default 'sessao',
  event_date date not null,
  start_time time not null,
  end_time time not null,
  location text,
  status public.appointment_status not null default 'scheduled',
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appt_time_valid check (end_time > start_time)
);
create index appointments_ws_date_idx on public.appointments(workspace_id, event_date);
create index appointments_prof_idx on public.appointments(professional_id, event_date);

create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  professional_id uuid not null references auth.users(id),
  title text not null,
  content text not null,
  category public.note_category not null default 'evolucao',
  visibility public.note_visibility not null default 'workspace',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clinical_notes_ws_idx on public.clinical_notes(workspace_id);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  category text,
  description text, instructions text,
  repetitions text, sets text, duration text,
  difficulty text,
  media_url text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exercises_ws_idx on public.exercises(workspace_id);

create table public.exercise_prescriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  professional_id uuid not null references auth.users(id),
  title text not null,
  description text,
  status text not null default 'active',
  start_date date, end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercise_prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.exercise_prescriptions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  repetitions text, sets text, duration text, notes text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  status public.charge_status not null default 'pending',
  payment_method text,
  paid_at timestamptz,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index charges_ws_due_idx on public.charges(workspace_id, due_date);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references auth.users(id),
  patient_id uuid references public.patients(id) on delete set null,
  due_date date,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'pending',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dictionary_terms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  term text not null,
  definition text not null,
  category text,
  is_global boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  theme public.theme_pref not null default 'automatic',
  notifications_enabled boolean not null default true,
  language text not null default 'pt-BR',
  mode public.use_mode not null default 'professional',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workspace_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan public.plan_kind not null default 'free',
  status text not null default 'trial',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  provider text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'system',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table public.tool_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  tool_type text not null,
  input_data jsonb not null default '{}'::jsonb,
  result_data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.daily_quotes (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  author text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ==================== updated_at triggers ====================
do $$
declare t text;
begin
  foreach t in array array[
    'workspaces','profiles','workspace_members','patients','appointments',
    'clinical_notes','exercises','exercise_prescriptions','charges','tasks',
    'dictionary_terms','user_settings','subscriptions'
  ] loop
    execute format('create trigger set_%s_updated before update on public.%s for each row execute function public.set_updated_at();', t, t);
  end loop;
end$$;

-- ==================== GRANTS ====================
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.patients to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.clinical_notes to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.exercise_prescriptions to authenticated;
grant select, insert, update, delete on public.exercise_prescription_items to authenticated;
grant select, insert, update, delete on public.charges to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.dictionary_terms to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant select, insert, update, delete on public.tool_records to authenticated;
grant select on public.daily_quotes to authenticated;
grant select on public.daily_quotes to anon;

do $$
declare t text;
begin
  foreach t in array array[
    'workspaces','profiles','workspace_members','patients','appointments',
    'clinical_notes','exercises','exercise_prescriptions','exercise_prescription_items',
    'charges','tasks','dictionary_terms','user_settings','subscriptions',
    'notifications','audit_logs','tool_records','daily_quotes'
  ] loop
    execute format('grant all on public.%I to service_role;', t);
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end$$;

-- ==================== RLS POLICIES ====================
-- profiles: user manages own profile
create policy profiles_self_select on public.profiles for select to authenticated
  using (auth_user_id = auth.uid());
create policy profiles_self_insert on public.profiles for insert to authenticated
  with check (auth_user_id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- workspaces: members can see; only admin can update; owner insert
create policy workspaces_member_select on public.workspaces for select to authenticated
  using (public.is_workspace_member(auth.uid(), id));
create policy workspaces_owner_insert on public.workspaces for insert to authenticated
  with check (owner_id = auth.uid());
create policy workspaces_admin_update on public.workspaces for update to authenticated
  using (public.is_workspace_admin(auth.uid(), id))
  with check (public.is_workspace_admin(auth.uid(), id));

-- workspace_members: user sees own memberships and admins see all in ws
create policy wsm_self_select on public.workspace_members for select to authenticated
  using (user_id = auth.uid() or public.is_workspace_admin(auth.uid(), workspace_id));
create policy wsm_self_insert on public.workspace_members for insert to authenticated
  with check (user_id = auth.uid() or public.is_workspace_admin(auth.uid(), workspace_id));
create policy wsm_admin_update on public.workspace_members for update to authenticated
  using (public.is_workspace_admin(auth.uid(), workspace_id));
create policy wsm_admin_delete on public.workspace_members for delete to authenticated
  using (public.is_workspace_admin(auth.uid(), workspace_id));

-- Generic ws-scoped policies for domain tables
do $$
declare t text;
begin
  foreach t in array array[
    'patients','appointments','clinical_notes','exercises','exercise_prescriptions',
    'charges','tasks','notifications','tool_records','user_settings','subscriptions'
  ] loop
    execute format($p$create policy %I on public.%I for select to authenticated using (public.is_workspace_member(auth.uid(), workspace_id));$p$, t||'_ws_select', t);
    execute format($p$create policy %I on public.%I for insert to authenticated with check (public.is_workspace_member(auth.uid(), workspace_id));$p$, t||'_ws_insert', t);
    execute format($p$create policy %I on public.%I for update to authenticated using (public.is_workspace_member(auth.uid(), workspace_id)) with check (public.is_workspace_member(auth.uid(), workspace_id));$p$, t||'_ws_update', t);
    execute format($p$create policy %I on public.%I for delete to authenticated using (public.is_workspace_member(auth.uid(), workspace_id));$p$, t||'_ws_delete', t);
  end loop;
end$$;

-- audit_logs: read/insert scoped to workspace members
create policy audit_ws_select on public.audit_logs for select to authenticated
  using (public.is_workspace_member(auth.uid(), workspace_id));
create policy audit_ws_insert on public.audit_logs for insert to authenticated
  with check (public.is_workspace_member(auth.uid(), workspace_id));

-- dictionary_terms: global rows readable by anyone signed in; workspace rows scoped
create policy dict_read on public.dictionary_terms for select to authenticated
  using (is_global or (workspace_id is not null and public.is_workspace_member(auth.uid(), workspace_id)));
create policy dict_insert on public.dictionary_terms for insert to authenticated
  with check (workspace_id is not null and public.is_workspace_member(auth.uid(), workspace_id));
create policy dict_update on public.dictionary_terms for update to authenticated
  using (workspace_id is not null and public.is_workspace_member(auth.uid(), workspace_id))
  with check (workspace_id is not null and public.is_workspace_member(auth.uid(), workspace_id));
create policy dict_delete on public.dictionary_terms for delete to authenticated
  using (workspace_id is not null and public.is_workspace_member(auth.uid(), workspace_id));

-- exercise_prescription_items: via parent prescription
create policy epi_select on public.exercise_prescription_items for select to authenticated using (
  exists (select 1 from public.exercise_prescriptions p
          where p.id = prescription_id and public.is_workspace_member(auth.uid(), p.workspace_id))
);
create policy epi_write on public.exercise_prescription_items for all to authenticated
  using (exists (select 1 from public.exercise_prescriptions p where p.id = prescription_id and public.is_workspace_member(auth.uid(), p.workspace_id)))
  with check (exists (select 1 from public.exercise_prescriptions p where p.id = prescription_id and public.is_workspace_member(auth.uid(), p.workspace_id)));

-- daily_quotes: publicly readable
create policy quotes_read on public.daily_quotes for select to authenticated using (true);
create policy quotes_read_anon on public.daily_quotes for select to anon using (true);

-- ==================== NEW USER BOOTSTRAP ====================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_workspace_id uuid;
  v_full_name text;
  v_is_sandbox boolean;
  v_ws_type public.workspace_type;
  v_ws_name text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Usuário');
  v_is_sandbox := coalesce((new.raw_user_meta_data->>'is_sandbox')::boolean, false);
  v_ws_type := case when v_is_sandbox then 'sandbox'::public.workspace_type else 'individual'::public.workspace_type end;
  v_ws_name := case when v_is_sandbox then 'Sandbox de ' || v_full_name else v_full_name end;

  insert into public.workspaces (name, type, owner_id, plan, status)
  values (v_ws_name, v_ws_type, new.id, 'pro_monthly', 'active')
  returning id into v_workspace_id;

  insert into public.profiles (auth_user_id, full_name, email, default_workspace_id)
  values (new.id, v_full_name, new.email, v_workspace_id);

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (v_workspace_id, new.id, 'admin', 'active');

  insert into public.user_settings (user_id, workspace_id) values (new.id, v_workspace_id);

  insert into public.subscriptions (workspace_id, plan, status)
  values (v_workspace_id, 'pro_monthly', 'active');

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed frases
insert into public.daily_quotes(text, author) values
  ('O corpo humano é a melhor imagem da alma humana.', 'Ludwig Wittgenstein'),
  ('Cuide do seu corpo. É o único lugar que você tem para viver.', 'Jim Rohn'),
  ('Movimento é medicina.', 'Anônimo'),
  ('A saúde é a maior das riquezas.', 'Virgílio'),
  ('Pequenos progressos, todos os dias, viram grandes conquistas.', 'Anônimo');
