
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

alter table public.workspaces
  add constraint workspaces_owner_fk foreign key (owner_id) references auth.users(id) on delete cascade;

-- ==================== HELPER FUNCTIONS ====================
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_workspace_member(_user_id uuid, _workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where user_id = _user_id and workspace_id = _workspace_id and status = 'active');
$$;

create or replace function private.is_workspace_admin(_user_id uuid, _workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where user_id = _user_id and workspace_id = _workspace_id and role in ('admin','super_admin') and status = 'active');
$$;

create or replace function private.has_workspace_role(_user_id uuid, _workspace_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where user_id = _user_id and workspace_id = _workspace_id and role = _role and status = 'active');
$$;

-- ==================== DOMAIN TABLES ====================
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  full_name text not null,
  phone text, whatsapp text, email text,
  birth_date date, cpf text, gender text,
  status public.patient_status not null default 'active',
  treatment_goal text, observations text,
  emergency_contact_name text, emergency_contact_phone text,
  rg text,
  address_street text, address_number text, address_complement text,
  address_district text, address_city text, address_state text, address_zip text,
  profession text, health_plan text,
  documents jsonb not null default '[]'::jsonb,
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
  event_date date not null, start_time time not null, end_time time not null,
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
  title text not null, content text not null,
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
  name text not null, category text,
  description text, instructions text,
  repetitions text, sets text, duration text,
  difficulty text, media_url text,
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
  title text not null, description text,
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
  payment_method text, paid_at timestamptz, notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index charges_ws_due_idx on public.charges(workspace_id, due_date);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null, description text,
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
  term text not null, definition text not null, category text,
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
  expires_at timestamptz, provider text, provider_subscription_id text,
  monthly_price numeric(10,2) default 0,
  due_day int default 10,
  current_period_start date, current_period_end date, next_due_date date,
  payment_method text,
  auto_block_after_days int default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, message text not null,
  type text not null default 'system',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null, entity_type text not null, entity_id uuid,
  old_data jsonb, new_data jsonb,
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
  text text not null, author text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN status text NOT NULL DEFAULT 'active',
  ADD COLUMN last_login_at timestamptz,
  ADD COLUMN phone_e164 text,
  ADD COLUMN phone_verified_at timestamptz;
CREATE INDEX idx_profiles_phone ON public.profiles (phone_e164);

-- Extend workspaces
ALTER TABLE public.workspaces
  ADD COLUMN responsible_name text,
  ADD COLUMN responsible_email text,
  ADD COLUMN phone text,
  ADD COLUMN cnpj text,
  ADD COLUMN monthly_price numeric(10,2),
  ADD COLUMN due_date date,
  ADD COLUMN max_users int,
  ADD COLUMN internal_notes text,
  ADD COLUMN last_access_at timestamptz;
ALTER TYPE public.workspace_status ADD VALUE IF NOT EXISTS 'overdue';
ALTER TYPE public.workspace_status ADD VALUE IF NOT EXISTS 'pending_payment';

-- ==================== updated_at triggers ====================
do $$ declare t text;
begin
  foreach t in array array['workspaces','profiles','workspace_members','patients','appointments','clinical_notes','exercises','exercise_prescriptions','charges','tasks','dictionary_terms','user_settings','subscriptions']
  loop execute format('create trigger set_%s_updated before update on public.%s for each row execute function public.set_updated_at();', t, t);
  end loop;
end$$;

-- ==================== GRANTS + RLS enable ====================
do $$ declare t text;
begin
  foreach t in array array['workspaces','profiles','workspace_members','patients','appointments','clinical_notes','exercises','exercise_prescriptions','exercise_prescription_items','charges','tasks','dictionary_terms','user_settings','subscriptions','notifications','audit_logs','tool_records','daily_quotes']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
    execute format('grant all on public.%I to service_role;', t);
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end$$;
grant select on public.daily_quotes to anon;
grant select, insert on public.audit_logs to authenticated;

-- ==================== RLS POLICIES ====================
create policy profiles_self_select on public.profiles for select to authenticated using (auth_user_id = auth.uid());
create policy profiles_self_insert on public.profiles for insert to authenticated with check (auth_user_id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

create policy workspaces_owner_insert on public.workspaces for insert to authenticated with check (owner_id = auth.uid());
create policy workspaces_member_select on public.workspaces for select to authenticated using (private.is_workspace_member(auth.uid(), id));
create policy workspaces_admin_update on public.workspaces for update to authenticated using (private.is_workspace_admin(auth.uid(), id)) with check (private.is_workspace_admin(auth.uid(), id));

create policy wsm_self_select on public.workspace_members for select to authenticated using (user_id = auth.uid() or private.is_workspace_admin(auth.uid(), workspace_id));
create policy wsm_self_insert on public.workspace_members for insert to authenticated with check (user_id = auth.uid() or private.is_workspace_admin(auth.uid(), workspace_id));
create policy wsm_admin_update on public.workspace_members for update to authenticated using (private.is_workspace_admin(auth.uid(), workspace_id));
create policy wsm_admin_delete on public.workspace_members for delete to authenticated using (private.is_workspace_admin(auth.uid(), workspace_id));

create policy audit_ws_select on public.audit_logs for select to authenticated using (private.is_workspace_member(auth.uid(), workspace_id));
create policy audit_ws_insert on public.audit_logs for insert to authenticated with check (private.is_workspace_member(auth.uid(), workspace_id));

create policy dict_read on public.dictionary_terms for select to authenticated using (is_global or (workspace_id is not null and private.is_workspace_member(auth.uid(), workspace_id)));
create policy dict_insert on public.dictionary_terms for insert to authenticated with check (workspace_id is not null and private.is_workspace_member(auth.uid(), workspace_id));
create policy dict_update on public.dictionary_terms for update to authenticated using (workspace_id is not null and private.is_workspace_member(auth.uid(), workspace_id)) with check (workspace_id is not null and private.is_workspace_member(auth.uid(), workspace_id));
create policy dict_delete on public.dictionary_terms for delete to authenticated using (workspace_id is not null and private.is_workspace_member(auth.uid(), workspace_id));

create policy epi_select on public.exercise_prescription_items for select to authenticated using (exists (select 1 from public.exercise_prescriptions p where p.id = prescription_id and private.is_workspace_member(auth.uid(), p.workspace_id)));
create policy epi_write on public.exercise_prescription_items for all to authenticated using (exists (select 1 from public.exercise_prescriptions p where p.id = prescription_id and private.is_workspace_member(auth.uid(), p.workspace_id))) with check (exists (select 1 from public.exercise_prescriptions p where p.id = prescription_id and private.is_workspace_member(auth.uid(), p.workspace_id)));

create policy quotes_read on public.daily_quotes for select to authenticated using (true);
create policy quotes_read_anon on public.daily_quotes for select to anon using (true);

do $$ declare t text;
begin
  foreach t in array array['patients','appointments','clinical_notes','exercises','exercise_prescriptions','charges','tasks','notifications','tool_records','user_settings','subscriptions']
  loop
    execute format($p$create policy %I on public.%I for select to authenticated using (private.is_workspace_member(auth.uid(), workspace_id));$p$, t||'_ws_select', t);
    execute format($p$create policy %I on public.%I for insert to authenticated with check (private.is_workspace_member(auth.uid(), workspace_id));$p$, t||'_ws_insert', t);
    execute format($p$create policy %I on public.%I for update to authenticated using (private.is_workspace_member(auth.uid(), workspace_id)) with check (private.is_workspace_member(auth.uid(), workspace_id));$p$, t||'_ws_update', t);
    execute format($p$create policy %I on public.%I for delete to authenticated using (private.is_workspace_member(auth.uid(), workspace_id));$p$, t||'_ws_delete', t);
  end loop;
end$$;

-- ==================== NEW USER BOOTSTRAP ====================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_workspace_id uuid; v_full_name text; v_is_sandbox boolean; v_ws_type public.workspace_type; v_ws_name text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Usuário');
  v_is_sandbox := coalesce((new.raw_user_meta_data->>'is_sandbox')::boolean, false);
  v_ws_type := case when v_is_sandbox then 'sandbox'::public.workspace_type else 'individual'::public.workspace_type end;
  v_ws_name := case when v_is_sandbox then 'Sandbox de ' || v_full_name else v_full_name end;
  insert into public.workspaces (name, type, owner_id, plan, status) values (v_ws_name, v_ws_type, new.id, 'pro_monthly', 'active') returning id into v_workspace_id;
  insert into public.profiles (auth_user_id, full_name, email, default_workspace_id) values (new.id, v_full_name, new.email, v_workspace_id);
  insert into public.workspace_members (workspace_id, user_id, role, status) values (v_workspace_id, new.id, 'admin', 'active');
  insert into public.user_settings (user_id, workspace_id) values (new.id, v_workspace_id);
  insert into public.subscriptions (workspace_id, plan, status) values (v_workspace_id, 'pro_monthly', 'active');
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.daily_quotes(text, author) values
  ('O corpo humano é a melhor imagem da alma humana.', 'Ludwig Wittgenstein'),
  ('Cuide do seu corpo. É o único lugar que você tem para viver.', 'Jim Rohn'),
  ('Movimento é medicina.', 'Anônimo'),
  ('A saúde é a maior das riquezas.', 'Virgílio'),
  ('Pequenos progressos, todos os dias, viram grandes conquistas.', 'Anônimo');

-- ==================== PLATFORM ADMIN ====================
CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

CREATE POLICY platform_admins_self_select ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY platform_admins_super_all ON public.platform_admins FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY workspaces_super_admin_all ON public.workspaces FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY workspace_members_super_all ON public.workspace_members FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY subscriptions_super_all ON public.subscriptions FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY profiles_super_select ON public.profiles FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY profiles_super_update ON public.profiles FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY audit_super_select ON public.audit_logs FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY audit_super_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));

-- Bootstrap: first user becomes super_admin
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.platform_admins LIMIT 1) THEN
    INSERT INTO public.platform_admins (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_bootstrap_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.bootstrap_super_admin();

-- ==================== INVOICES ====================
CREATE TYPE public.invoice_status AS ENUM ('pending','paid','overdue','cancelled','refunded','manual_release');

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  paid_at timestamptz,
  status public.invoice_status NOT NULL DEFAULT 'pending',
  payment_method text, external_payment_id text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_super_all ON public.invoices FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY invoices_ws_select ON public.invoices FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER set_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX invoices_workspace_idx ON public.invoices(workspace_id);
CREATE INDEX invoices_status_due_idx ON public.invoices(status, due_date);

-- ==================== EVENTS ====================
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  source text NOT NULL DEFAULT 'app',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_super_all ON public.events FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY events_self_insert ON public.events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE INDEX events_type_created_idx ON public.events(event_type, created_at DESC);
CREATE INDEX events_workspace_idx ON public.events(workspace_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_event(_event_type text, _workspace_id uuid DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb, _source text DEFAULT 'app')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.events (workspace_id, company_id, user_id, event_type, source, metadata)
  VALUES (_workspace_id, _workspace_id, auth.uid(), _event_type, _source, coalesce(_metadata,'{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_event(text, uuid, jsonb, text) TO authenticated;

-- ==================== WEBHOOKS ====================
CREATE TYPE public.webhook_status AS ENUM ('active','inactive');
CREATE TYPE public.delivery_status AS ENUM ('pending','success','failed','retrying');

CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL, url text NOT NULL, description text,
  secret text NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'),
  events text[] NOT NULL DEFAULT '{}',
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.webhook_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhooks TO authenticated;
GRANT ALL ON public.webhooks TO service_role;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhooks_super_all ON public.webhooks FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER set_webhooks_updated BEFORE UPDATE ON public.webhooks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  event_type text NOT NULL, url text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_status int, response_body text,
  status public.delivery_status NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_retry_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_deliveries_super_all ON public.webhook_deliveries FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE INDEX webhook_deliveries_pending_idx ON public.webhook_deliveries(status, next_retry_at) WHERE status IN ('pending','retrying');
CREATE INDEX webhook_deliveries_webhook_idx ON public.webhook_deliveries(webhook_id, created_at DESC);

-- ==================== ADMIN SETTINGS ====================
CREATE TABLE public.admin_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  auto_block_after_days int NOT NULL DEFAULT 7,
  sandbox_enabled boolean NOT NULL DEFAULT true,
  pro_monthly_price numeric(10,2) NOT NULL DEFAULT 89.90,
  pro_yearly_price numeric(10,2) NOT NULL DEFAULT 899.00,
  support_email text, support_whatsapp text,
  webhooks_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_settings_super_all ON public.admin_settings FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER set_admin_settings_updated BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.admin_settings (id) VALUES (1);

-- Event -> webhook dispatch trigger
CREATE OR REPLACE FUNCTION public.dispatch_event_webhooks()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w RECORD; enabled boolean;
BEGIN
  SELECT webhooks_enabled INTO enabled FROM public.admin_settings WHERE id = 1;
  IF enabled IS FALSE THEN RETURN NEW; END IF;
  FOR w IN SELECT id, url FROM public.webhooks WHERE status = 'active' AND (NEW.event_type = ANY(events) OR '*' = ANY(events)) AND (workspace_id IS NULL OR workspace_id = NEW.workspace_id) LOOP
    INSERT INTO public.webhook_deliveries (webhook_id, event_id, event_type, url, payload, status, next_retry_at)
    VALUES (w.id, NEW.id, NEW.event_type, w.url,
      jsonb_build_object('event_id', NEW.id, 'event_type', NEW.event_type, 'workspace_id', NEW.workspace_id, 'user_id', NEW.user_id, 'metadata', NEW.metadata, 'created_at', NEW.created_at),
      'pending', now());
  END LOOP;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_dispatch_event_webhooks AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.dispatch_event_webhooks();

CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE block_days int; rec RECORD;
BEGIN
  SELECT auto_block_after_days INTO block_days FROM public.admin_settings WHERE id = 1;
  block_days := coalesce(block_days, 7);
  UPDATE public.invoices SET status = 'overdue', updated_at = now() WHERE status = 'pending' AND due_date < current_date;
  UPDATE public.workspaces w SET status = 'overdue', updated_at = now() FROM public.invoices i WHERE i.workspace_id = w.id AND i.status = 'overdue' AND w.status = 'active';
  FOR rec IN SELECT DISTINCT w.id FROM public.workspaces w JOIN public.invoices i ON i.workspace_id = w.id WHERE i.status = 'overdue' AND (current_date - i.due_date) >= block_days AND w.status <> 'blocked' LOOP
    UPDATE public.workspaces SET status = 'blocked', updated_at = now() WHERE id = rec.id;
    INSERT INTO public.events (workspace_id, company_id, event_type, source, metadata) VALUES (rec.id, rec.id, 'company.blocked_by_overdue', 'system', jsonb_build_object('auto', true));
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_monthly_invoices()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; next_due date;
BEGIN
  FOR r IN SELECT s.id AS sub_id, s.workspace_id, s.monthly_price, s.due_day, s.next_due_date FROM public.subscriptions s JOIN public.workspaces w ON w.id = s.workspace_id WHERE s.status IN ('active','trial') AND w.status IN ('active','trial','overdue','pending_payment') LOOP
    next_due := coalesce(r.next_due_date, make_date(extract(year from current_date)::int, extract(month from current_date)::int, coalesce(r.due_day,10)));
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE subscription_id = r.sub_id AND due_date = next_due) THEN
      INSERT INTO public.invoices (workspace_id, subscription_id, amount, due_date, status) VALUES (r.workspace_id, r.sub_id, coalesce(r.monthly_price,0), next_due, 'pending');
    END IF;
    UPDATE public.subscriptions SET next_due_date = (next_due + interval '1 month')::date WHERE id = r.sub_id;
  END LOOP;
END; $$;

REVOKE ALL ON FUNCTION public.dispatch_event_webhooks() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.mark_overdue_invoices() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.generate_monthly_invoices() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.bootstrap_super_admin() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

-- ==================== CRM + BOOKING ====================
CREATE TYPE public.crm_stage AS ENUM ('novo','contato','qualificado','agendado','convertido','perdido');
CREATE TYPE public.crm_source AS ENUM ('booking_link','manual','import','referral');
CREATE TYPE public.crm_activity_type AS ENUM ('nota','ligacao','email','whatsapp','reuniao','outro');
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','cancelled');

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL, email text, phone text,
  source public.crm_source NOT NULL DEFAULT 'manual',
  stage public.crm_stage NOT NULL DEFAULT 'novo',
  notes text, tags text[] NOT NULL DEFAULT '{}',
  value_cents integer NOT NULL DEFAULT 0,
  last_contact_at timestamptz, next_action_at timestamptz,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_leads_ws_stage_idx ON public.crm_leads (workspace_id, stage);
CREATE INDEX crm_leads_ws_created_idx ON public.crm_leads (workspace_id, created_at DESC);
CREATE INDEX crm_leads_email_idx ON public.crm_leads (workspace_id, lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_leads_select ON public.crm_leads FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY crm_leads_insert ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY crm_leads_update ON public.crm_leads FOR UPDATE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY crm_leads_delete ON public.crm_leads FOR DELETE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER crm_leads_updated BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type public.crm_activity_type NOT NULL DEFAULT 'nota',
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_activities_lead_idx ON public.crm_activities (lead_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_activities_select ON public.crm_activities FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY crm_activities_insert ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY crm_activities_update ON public.crm_activities FOR UPDATE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY crm_activities_delete ON public.crm_activities FOR DELETE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.booking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'Agendar reunião',
  description text,
  duration_min integer NOT NULL DEFAULT 30,
  buffer_min integer NOT NULL DEFAULT 0,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  working_days integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',
  advance_days integer NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_links_time_valid CHECK (end_time > start_time),
  CONSTRAINT booking_links_slug_fmt CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,60}$')
);
CREATE INDEX booking_links_ws_idx ON public.booking_links (workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_links TO authenticated;
GRANT ALL ON public.booking_links TO service_role;
ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY booking_links_ws_select ON public.booking_links FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY booking_links_ws_insert ON public.booking_links FOR INSERT TO authenticated WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id) AND owner_user_id = auth.uid());
CREATE POLICY booking_links_ws_update ON public.booking_links FOR UPDATE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY booking_links_ws_delete ON public.booking_links FOR DELETE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER booking_links_updated BEFORE UPDATE ON public.booking_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id uuid NOT NULL REFERENCES public.booking_links(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_name text NOT NULL, lead_email text, lead_phone text, notes text,
  scheduled_at timestamptz NOT NULL,
  duration_min integer NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX booking_requests_link_idx ON public.booking_requests (booking_link_id, scheduled_at);
CREATE INDEX booking_requests_ws_idx ON public.booking_requests (workspace_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY booking_requests_ws_select ON public.booking_requests FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY booking_requests_ws_update ON public.booking_requests FOR UPDATE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY booking_requests_ws_delete ON public.booking_requests FOR DELETE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));

CREATE OR REPLACE FUNCTION public.handle_new_booking_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_link RECORD; v_appt_id uuid; v_lead_id uuid; v_start time; v_end time; v_date date;
BEGIN
  SELECT * INTO v_link FROM public.booking_links WHERE id = NEW.booking_link_id;
  v_date := (NEW.scheduled_at AT TIME ZONE coalesce(v_link.timezone,'America/Sao_Paulo'))::date;
  v_start := (NEW.scheduled_at AT TIME ZONE coalesce(v_link.timezone,'America/Sao_Paulo'))::time;
  v_end := v_start + make_interval(mins => NEW.duration_min);
  INSERT INTO public.appointments (workspace_id, professional_id, title, type, event_date, start_time, end_time, status, notes, created_by)
  VALUES (NEW.workspace_id, NEW.owner_user_id, coalesce(v_link.title,'Reunião') || ' — ' || NEW.lead_name, 'outro'::public.appointment_type, v_date, v_start, v_end, 'scheduled'::public.appointment_status,
    coalesce(NEW.notes,'') || E'\n\nContato: ' || coalesce(NEW.lead_email,'') || ' ' || coalesce(NEW.lead_phone,''), NEW.owner_user_id) RETURNING id INTO v_appt_id;
  IF NEW.lead_email IS NOT NULL AND length(NEW.lead_email) > 0 THEN
    SELECT id INTO v_lead_id FROM public.crm_leads WHERE workspace_id = NEW.workspace_id AND lower(email) = lower(NEW.lead_email) LIMIT 1;
  END IF;
  IF v_lead_id IS NULL THEN
    INSERT INTO public.crm_leads (workspace_id, owner_user_id, name, email, phone, source, stage, notes)
    VALUES (NEW.workspace_id, NEW.owner_user_id, NEW.lead_name, NEW.lead_email, NEW.lead_phone, 'booking_link'::public.crm_source, 'agendado'::public.crm_stage, NEW.notes) RETURNING id INTO v_lead_id;
  ELSE
    UPDATE public.crm_leads SET stage='agendado', last_contact_at=now(), updated_at=now() WHERE id = v_lead_id;
  END IF;
  INSERT INTO public.crm_activities (lead_id, workspace_id, type, content, created_by)
  VALUES (v_lead_id, NEW.workspace_id, 'reuniao'::public.crm_activity_type, 'Reunião agendada via link "' || coalesce(v_link.title,'') || '" para ' || to_char(NEW.scheduled_at,'DD/MM/YYYY HH24:MI'), NEW.owner_user_id);
  UPDATE public.booking_requests SET appointment_id = v_appt_id, lead_id = v_lead_id WHERE id = NEW.id;
  INSERT INTO public.notifications (workspace_id, user_id, title, message, type)
  VALUES (NEW.workspace_id, NEW.owner_user_id, 'Nova reunião agendada', NEW.lead_name || ' agendou para ' || to_char(NEW.scheduled_at,'DD/MM/YYYY HH24:MI'), 'booking');
  INSERT INTO public.events (workspace_id, company_id, user_id, event_type, source, metadata)
  VALUES (NEW.workspace_id, NEW.workspace_id, NEW.owner_user_id, 'booking.created', 'public_booking',
    jsonb_build_object('booking_request_id', NEW.id, 'lead_name', NEW.lead_name, 'lead_email', NEW.lead_email, 'scheduled_at', NEW.scheduled_at, 'appointment_id', v_appt_id, 'lead_id', v_lead_id));
  RETURN NEW;
END $$;
CREATE TRIGGER booking_request_after_insert AFTER INSERT ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.handle_new_booking_request();
REVOKE EXECUTE ON FUNCTION public.handle_new_booking_request() FROM PUBLIC, anon, authenticated;

-- ==================== LANDING LEADS ====================
CREATE TABLE public.landing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, email text NOT NULL, whatsapp text,
  usage_type text NOT NULL CHECK (usage_type IN ('profissional','clinica')),
  message text,
  source text NOT NULL DEFAULT 'landing_page',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landing_leads_name_len CHECK (char_length(name) BETWEEN 2 AND 100),
  CONSTRAINT landing_leads_email_len CHECK (char_length(email) BETWEEN 5 AND 255),
  CONSTRAINT landing_leads_whatsapp_len CHECK (whatsapp IS NULL OR char_length(whatsapp) <= 30),
  CONSTRAINT landing_leads_message_len CHECK (message IS NULL OR char_length(message) <= 500)
);
CREATE INDEX idx_landing_leads_created_at ON public.landing_leads (created_at DESC);
CREATE INDEX idx_landing_leads_email ON public.landing_leads (lower(email));
GRANT INSERT ON public.landing_leads TO anon;
GRANT INSERT, SELECT ON public.landing_leads TO authenticated;
GRANT ALL ON public.landing_leads TO service_role;
ALTER TABLE public.landing_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a landing lead" ON public.landing_leads FOR INSERT TO anon, authenticated WITH CHECK (source = 'landing_page');
CREATE POLICY "Platform admins can read landing leads" ON public.landing_leads FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Platform admins can delete landing leads" ON public.landing_leads FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

-- ==================== STICKY NOTES ====================
CREATE TABLE public.sticky_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  title text NOT NULL, content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'geral',
  color text NOT NULL DEFAULT 'yellow',
  priority text NOT NULL DEFAULT 'medium',
  is_pinned boolean NOT NULL DEFAULT false,
  is_important boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  reminder_at timestamptz,
  view_status text NOT NULL DEFAULT 'ideias',
  position integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'private',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sticky_notes TO authenticated;
GRANT ALL ON public.sticky_notes TO service_role;
ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read sticky notes in workspace" ON public.sticky_notes FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sticky_notes.workspace_id AND wm.user_id = auth.uid() AND wm.status = 'active') AND (visibility = 'workspace' OR user_id = auth.uid()));
CREATE POLICY "Insert sticky notes in own workspace" ON public.sticky_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sticky_notes.workspace_id AND wm.user_id = auth.uid() AND wm.status = 'active'));
CREATE POLICY "Update own sticky notes" ON public.sticky_notes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Delete own sticky notes" ON public.sticky_notes FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_sticky_notes_workspace ON public.sticky_notes(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sticky_notes_user ON public.sticky_notes(user_id) WHERE deleted_at IS NULL;
CREATE TRIGGER set_sticky_notes_updated_at BEFORE UPDATE ON public.sticky_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==================== WHATSAPP / BTZAP ====================
CREATE TABLE public.btzap_config (
  id smallint PRIMARY KEY DEFAULT 1,
  token text, url_base text, webhook_secret text,
  endpoint_qr text NOT NULL DEFAULT '/instance/init',
  endpoint_status text NOT NULL DEFAULT '/instance/status',
  endpoint_disconnect text NOT NULL DEFAULT '/instance/disconnect',
  endpoint_send_text text NOT NULL DEFAULT '/message/text',
  endpoint_send_buttons text NOT NULL DEFAULT '/message/buttons',
  endpoint_send_template text NOT NULL DEFAULT '/message/template',
  instance_id text,
  connection_status text NOT NULL DEFAULT 'disconnected',
  qr_code text, phone_number text, profile_name text,
  last_check_at timestamptz, last_error text,
  billing_automation_enabled boolean NOT NULL DEFAULT false,
  billing_days_before int NOT NULL DEFAULT 3,
  billing_days_after int NOT NULL DEFAULT 1,
  otp_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT btzap_config_singleton CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.btzap_config TO authenticated;
GRANT ALL ON public.btzap_config TO service_role;
ALTER TABLE public.btzap_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage BTZAP config" ON public.btzap_config FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_btzap_config_updated_at BEFORE UPDATE ON public.btzap_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.btzap_config (id) VALUES (1);

CREATE TABLE public.whatsapp_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_number text NOT NULL, body text, template text,
  status text NOT NULL DEFAULT 'queued',
  external_id text, error text,
  related_type text, related_id uuid,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz, delivered_at timestamptz, read_at timestamptz, failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_message_logs (created_at DESC);
CREATE INDEX idx_whatsapp_logs_status ON public.whatsapp_message_logs (status);
CREATE INDEX idx_whatsapp_logs_to ON public.whatsapp_message_logs (to_number);
CREATE INDEX idx_whatsapp_logs_external ON public.whatsapp_message_logs (external_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_message_logs TO authenticated;
GRANT ALL ON public.whatsapp_message_logs TO service_role;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins view WhatsApp logs" ON public.whatsapp_message_logs FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins insert WhatsApp logs" ON public.whatsapp_message_logs FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins update WhatsApp logs" ON public.whatsapp_message_logs FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_whatsapp_logs_updated_at BEFORE UPDATE ON public.whatsapp_message_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.whatsapp_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL, code_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('login','reset','signup','verify')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  attempts int NOT NULL DEFAULT 0, max_attempts int NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip text, user_agent text
);
CREATE INDEX idx_wpp_otp_phone_purpose ON public.whatsapp_otp_codes (phone, purpose, created_at DESC);
CREATE INDEX idx_wpp_otp_expires ON public.whatsapp_otp_codes (expires_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_otp_codes TO authenticated;
GRANT INSERT ON public.whatsapp_otp_codes TO anon;
GRANT ALL ON public.whatsapp_otp_codes TO service_role;
ALTER TABLE public.whatsapp_otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Nobody reads OTP client-side" ON public.whatsapp_otp_codes FOR SELECT TO authenticated USING (false);

CREATE TYPE public.template_category AS ENUM ('reminder', 'due_today', 'overdue', 'negotiation', 'payment_confirmed', 'custom');
CREATE TYPE public.template_format AS ENUM ('text', 'html');
CREATE TYPE public.whatsapp_message_type AS ENUM ('text','button','list');

CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL, purpose text NOT NULL, body text NOT NULL,
  buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  category public.template_category NOT NULL DEFAULT 'custom',
  format public.template_format NOT NULL DEFAULT 'text',
  description text,
  message_type public.whatsapp_message_type NOT NULL DEFAULT 'text',
  footer_text text, list_button_text text,
  list_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO authenticated;
GRANT ALL ON public.whatsapp_templates TO service_role;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage templates" ON public.whatsapp_templates FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_wpp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.whatsapp_templates (key, name, purpose, body, buttons, variables) VALUES
  ('cobranca_mensal', 'Cobrança mensal', 'billing', E'Olá {nome}! 👋\n\nSua mensalidade do FisioFlow está disponível:\n\n💰 Valor: R$ {valor}\n📅 Vencimento: {vencimento}\n\nToque no botão abaixo para pagar agora.', '[{"id":"pay","text":"Pagar agora","url":"{link_pagamento}"},{"id":"view","text":"Ver detalhes","url":"{link_fatura}"}]'::jsonb, '["nome","valor","vencimento","link_pagamento","link_fatura"]'::jsonb),
  ('cobranca_vencida', 'Cobrança vencida', 'billing', E'Olá {nome},\n\n⚠️ Sua mensalidade venceu em {vencimento} e ainda não foi paga.\n\n💰 Valor: R$ {valor}\n\nPara evitar bloqueio da conta, regularize agora:', '[{"id":"pay","text":"Pagar agora","url":"{link_pagamento}"}]'::jsonb, '["nome","valor","vencimento","link_pagamento"]'::jsonb),
  ('codigo_login', 'Código de login', 'otp_login', E'🔐 *FisioFlow*\n\nSeu código de acesso é:\n\n*{codigo}*\n\nExpira em 10 minutos. Se não foi você, ignore esta mensagem.', '[]'::jsonb, '["codigo"]'::jsonb),
  ('codigo_reset', 'Código de redefinição de senha', 'otp_reset', E'🔑 *FisioFlow*\n\nCódigo para redefinir sua senha:\n\n*{codigo}*\n\nExpira em 10 minutos. Se não foi você, ignore.', '[]'::jsonb, '["codigo"]'::jsonb),
  ('codigo_cadastro', 'Confirmação de cadastro', 'otp_signup', E'👋 Bem-vindo(a) ao FisioFlow!\n\nCódigo de confirmação:\n\n*{codigo}*\n\nExpira em 10 minutos.', '[]'::jsonb, '["codigo"]'::jsonb);

-- ==================== DUNNING ====================
CREATE TYPE public.dunning_trigger AS ENUM ('before_due', 'on_due', 'after_due');
CREATE TYPE public.dunning_channel AS ENUM ('whatsapp', 'email', 'both');
CREATE TYPE public.dunning_exec_status AS ENUM ('sent', 'failed', 'skipped', 'stopped', 'pending_provider');

CREATE TABLE public.dunning_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, description text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  stop_on_paid boolean NOT NULL DEFAULT true,
  stop_on_negotiation boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_flows TO authenticated;
GRANT ALL ON public.dunning_flows TO service_role;
ALTER TABLE public.dunning_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admins manage dunning flows" ON public.dunning_flows FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_dunning_flows_updated BEFORE UPDATE ON public.dunning_flows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE UNIQUE INDEX uq_dunning_flows_default ON public.dunning_flows ((true)) WHERE is_default = true;

CREATE TABLE public.dunning_flow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.dunning_flows(id) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 0,
  trigger_type public.dunning_trigger NOT NULL,
  offset_days int NOT NULL DEFAULT 0,
  template_id uuid REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  channel public.dunning_channel NOT NULL DEFAULT 'whatsapp',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_flow_steps TO authenticated;
GRANT ALL ON public.dunning_flow_steps TO service_role;
ALTER TABLE public.dunning_flow_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admins manage dunning steps" ON public.dunning_flow_steps FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE INDEX idx_dunning_steps_flow ON public.dunning_flow_steps(flow_id, order_index);
CREATE TRIGGER trg_dunning_steps_updated BEFORE UPDATE ON public.dunning_flow_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dunning_flow_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.dunning_flows(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_flow_assignments TO authenticated;
GRANT ALL ON public.dunning_flow_assignments TO service_role;
ALTER TABLE public.dunning_flow_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admins manage dunning assignments" ON public.dunning_flow_assignments FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE INDEX idx_dunning_assign_workspace ON public.dunning_flow_assignments(workspace_id);
CREATE INDEX idx_dunning_assign_plan ON public.dunning_flow_assignments(plan);

CREATE TABLE public.dunning_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES public.dunning_flows(id) ON DELETE SET NULL,
  step_id uuid REFERENCES public.dunning_flow_steps(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel public.dunning_channel NOT NULL DEFAULT 'whatsapp',
  status public.dunning_exec_status NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  error text, rendered_body text,
  message_log_id uuid REFERENCES public.whatsapp_message_logs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_executions TO authenticated;
GRANT ALL ON public.dunning_executions TO service_role;
ALTER TABLE public.dunning_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admins view dunning executions" ON public.dunning_executions FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE UNIQUE INDEX uq_dunning_exec_step_invoice ON public.dunning_executions(step_id, invoice_id) WHERE step_id IS NOT NULL AND invoice_id IS NOT NULL AND status IN ('sent','pending_provider');
CREATE INDEX idx_dunning_exec_invoice ON public.dunning_executions(invoice_id);
CREATE INDEX idx_dunning_exec_workspace_time ON public.dunning_executions(workspace_id, sent_at DESC);
CREATE INDEX idx_dunning_exec_status ON public.dunning_executions(status);

DO $$ DECLARE v_flow uuid; t_reminder uuid; t_due uuid; t_overdue uuid; t_negotiation uuid; t_final uuid;
BEGIN
  INSERT INTO public.whatsapp_templates (key, name, purpose, body, category, format, description, active)
  VALUES ('dunning_reminder', 'Lembrete pré-vencimento', 'reminder', 'Olá {{cliente}}! Sua mensalidade do FisioFlow de {{valor}} vence em {{dias_para_vencer}} dias ({{vencimento}}). Pague em: {{link_pagamento}}', 'reminder', 'text', 'Enviado 3 dias antes do vencimento', true);
  INSERT INTO public.whatsapp_templates (key, name, purpose, body, category, format, description, active)
  VALUES ('dunning_due_today', 'Vence hoje', 'due_today', '⚠️ {{cliente}}, sua mensalidade de {{valor}} vence HOJE ({{vencimento}}). Evite o bloqueio: {{link_pagamento}}', 'due_today', 'text', 'Enviado no dia do vencimento', true);
  INSERT INTO public.whatsapp_templates (key, name, purpose, body, category, format, description, active)
  VALUES ('dunning_overdue', 'Fatura vencida', 'overdue', '{{cliente}}, sua fatura de {{valor}} venceu há {{dias_atraso}} dia(s). Regularize agora: {{link_pagamento}}', 'overdue', 'text', 'Enviado 1 dia após vencimento', true);
  INSERT INTO public.whatsapp_templates (key, name, purpose, body, category, format, description, active)
  VALUES ('dunning_negotiation', 'Proposta de negociação', 'negotiation', '{{cliente}}, sua fatura de {{valor}} está atrasada há {{dias_atraso}} dias. Podemos negociar? Fale conosco.', 'negotiation', 'text', 'Enviado 3 dias após vencimento', true);
  INSERT INTO public.whatsapp_templates (key, name, purpose, body, category, format, description, active)
  VALUES ('dunning_final_notice', 'Aviso final antes do bloqueio', 'overdue', 'ÚLTIMO AVISO — {{cliente}}, sua conta será bloqueada em breve. Débito: {{valor}} ({{dias_atraso}} dias). Regularize: {{link_pagamento}}', 'overdue', 'text', 'Enviado 7 dias após vencimento', true);
  INSERT INTO public.whatsapp_templates (key, name, purpose, body, category, format, description, active)
  VALUES ('dunning_payment_confirmed', 'Confirmação de pagamento', 'payment_confirmed', '✅ Pagamento de {{valor}} confirmado, {{cliente}}! Obrigado.', 'payment_confirmed', 'text', 'Enviado quando fatura é paga', true);

  SELECT id INTO t_reminder FROM public.whatsapp_templates WHERE key='dunning_reminder';
  SELECT id INTO t_due FROM public.whatsapp_templates WHERE key='dunning_due_today';
  SELECT id INTO t_overdue FROM public.whatsapp_templates WHERE key='dunning_overdue';
  SELECT id INTO t_negotiation FROM public.whatsapp_templates WHERE key='dunning_negotiation';
  SELECT id INTO t_final FROM public.whatsapp_templates WHERE key='dunning_final_notice';

  INSERT INTO public.dunning_flows (name, description, is_default, is_active)
  VALUES ('Recuperação Padrão', 'Fluxo completo: lembrete → vencimento → cobrança → negociação → aviso final', true, true)
  RETURNING id INTO v_flow;

  INSERT INTO public.dunning_flow_steps (flow_id, order_index, trigger_type, offset_days, template_id, channel) VALUES
    (v_flow, 1, 'before_due', -3, t_reminder, 'whatsapp'),
    (v_flow, 2, 'on_due', 0, t_due, 'whatsapp'),
    (v_flow, 3, 'after_due', 1, t_overdue, 'whatsapp'),
    (v_flow, 4, 'after_due', 3, t_negotiation, 'whatsapp'),
    (v_flow, 5, 'after_due', 7, t_final, 'whatsapp');
END $$;

-- ==================== BROADCASTS ====================
CREATE TABLE public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  template_id uuid REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  custom_body text,
  scope text NOT NULL DEFAULT 'active',
  plan text,
  audience_total int NOT NULL DEFAULT 0,
  sent int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  rendered_sample text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_all_broadcasts" ON public.broadcasts FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.broadcast_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  workspace_id uuid, phone text,
  status text NOT NULL DEFAULT 'pending',
  error text, rendered_body text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_broadcast_deliveries_bid ON public.broadcast_deliveries(broadcast_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_deliveries TO authenticated;
GRANT ALL ON public.broadcast_deliveries TO service_role;
ALTER TABLE public.broadcast_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_all_broadcast_deliveries" ON public.broadcast_deliveries FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- ==================== SECURITY ====================
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid, user_id uuid, phone text, ip_address text,
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  source text NOT NULL CHECK (source IN ('web','api','whatsapp','admin','webhook','system')),
  risk_score int NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX idx_security_events_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_read_events" ON public.security_events FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE TABLE public.blocked_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('ip','phone','email','user','workspace','device')),
  value_hash text NOT NULL, value_masked text NOT NULL,
  reason text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('medium','high','critical')),
  blocked_until timestamptz,
  is_permanent boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(type, value_hash)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_identifiers TO authenticated;
GRANT ALL ON public.blocked_identifiers TO service_role;
ALTER TABLE public.blocked_identifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_manage_blocks" ON public.blocked_identifiers FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.rate_limit_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target text NOT NULL CHECK (target IN ('ip','user','phone','email','workspace','endpoint')),
  endpoint_pattern text NOT NULL DEFAULT '*',
  max_requests int NOT NULL, window_seconds int NOT NULL,
  action text NOT NULL DEFAULT 'block' CHECK (action IN ('log','challenge','block','quarantine')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_rules TO authenticated;
GRANT ALL ON public.rate_limit_rules TO service_role;
ALTER TABLE public.rate_limit_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_manage_ratelimit" ON public.rate_limit_rules FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_rate_limit_rules_updated BEFORE UPDATE ON public.rate_limit_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.prompt_injection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, pattern text NOT NULL,
  category text NOT NULL CHECK (category IN ('system_prompt','data_exfiltration','tool_abuse','credential_theft','bypass','other')),
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  action text NOT NULL DEFAULT 'log' CHECK (action IN ('log','quarantine','block_ai','block_number')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_injection_rules TO authenticated;
GRANT ALL ON public.prompt_injection_rules TO service_role;
ALTER TABLE public.prompt_injection_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_manage_pi_rules" ON public.prompt_injection_rules FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_pi_rules_updated BEFORE UPDATE ON public.prompt_injection_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, description text NOT NULL DEFAULT '',
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','contained','resolved','false_positive')),
  source text NOT NULL CHECK (source IN ('web','api','whatsapp','admin','system')),
  affected_workspace_id uuid, affected_user_id uuid, affected_phone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz, assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_incidents TO authenticated;
GRANT ALL ON public.security_incidents TO service_role;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_manage_incidents" ON public.security_incidents FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_incidents_updated BEFORE UPDATE ON public.security_incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lgpd_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  requester_name text NOT NULL, requester_email text, requester_phone text,
  request_type text NOT NULL CHECK (request_type IN ('access','correction','deletion','anonymization','portability','consent_revocation')),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','validating_identity','processing','completed','rejected')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lgpd_requests TO authenticated;
GRANT ALL ON public.lgpd_requests TO service_role;
ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_manage_lgpd" ON public.lgpd_requests FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_lgpd_updated BEFORE UPDATE ON public.lgpd_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.security_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  anti_bot_enabled boolean NOT NULL DEFAULT true,
  honeypot_enabled boolean NOT NULL DEFAULT true,
  captcha_enabled boolean NOT NULL DEFAULT false,
  min_form_seconds int NOT NULL DEFAULT 2,
  prompt_injection_enabled boolean NOT NULL DEFAULT true,
  waf_enabled boolean NOT NULL DEFAULT false,
  cors_strict boolean NOT NULL DEFAULT true,
  max_payload_kb int NOT NULL DEFAULT 512,
  dpo_name text, dpo_email text,
  privacy_policy_url text, terms_url text,
  data_retention_days int NOT NULL DEFAULT 365,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.security_settings (id) VALUES (1);
GRANT SELECT, INSERT, UPDATE ON public.security_settings TO authenticated;
GRANT ALL ON public.security_settings TO service_role;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_manage_sec_settings" ON public.security_settings FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_sec_settings_updated BEFORE UPDATE ON public.security_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.prompt_injection_rules (name, pattern, category, severity, action) VALUES
  ('Ignore instruções anteriores', '(?i)(ignore|desconsidere|esquec[aá])\s+(as|todas as)?\s*(instru[cç][oõ]es|regras|prompts?)', 'bypass', 'high', 'block_ai'),
  ('Revelar system prompt', '(?i)(mostre|revele|exiba|imprima|repita)\s+(seu|o)?\s*(system\s*)?prompt', 'system_prompt', 'high', 'block_ai'),
  ('Vazar token/API key', '(?i)(token|api[_\s-]?key|chave\s+api|senha\s+admin|service[_\s-]?role)', 'credential_theft', 'critical', 'block_number'),
  ('Atuar como admin', '(?i)(aja|atue|responda|finja)\s+como\s+(admin|administrador|root|dev)', 'bypass', 'high', 'block_ai'),
  ('Executar função interna', '(?i)(execute|rode|chame|invoque)\s+(a\s+)?(fun[cç][ãa]o|api\s+interna|endpoint)', 'tool_abuse', 'critical', 'block_number'),
  ('Redefinir senha de terceiro', '(?i)redefinir?\s+(a\s+)?senha\s+(do|desse|de\s+outro)', 'tool_abuse', 'critical', 'block_number'),
  ('Marcar pagamento manualmente', '(?i)(marque|d[eê])\s+(essa|a)?\s*(mensalidade|cobran[cç]a|fatura)\s+como\s+paga', 'tool_abuse', 'high', 'quarantine'),
  ('Exportar/vazar dados de clientes', '(?i)(exporte|envie|me\s+d[eê]|liste)\s+(os\s+)?dados\s+(de|dos)\s+(outros|todos|clientes|pacientes)', 'data_exfiltration', 'critical', 'block_number'),
  ('Deletar dados', '(?i)(delete|apague|remova)\s+(todos|tudo|os\s+dados|a\s+base)', 'tool_abuse', 'critical', 'block_number'),
  ('Desativar segurança', '(?i)(desative|desligue|remova)\s+(a\s+)?(seguran[cç]a|prote[cç][ãa]o|firewall|rls)', 'bypass', 'critical', 'block_number'),
  ('Alterar token WhatsApp', '(?i)(altere|troque|mude)\s+(o\s+)?token\s+(btzap|whatsapp)', 'credential_theft', 'critical', 'block_number'),
  ('Desconectar WhatsApp', '(?i)(desconecte|delete\s+a\s+inst[aâ]ncia|logout)\s+(do\s+)?whatsapp', 'tool_abuse', 'high', 'quarantine'),
  ('DAN / jailbreak', '(?i)(dan|jailbreak|modo\s+desenvolvedor|developer\s+mode)', 'bypass', 'high', 'block_ai'),
  ('Prompt em outro idioma para bypass', '(?i)(system:|assistant:|<\|.*\|>|###\s*instruction)', 'bypass', 'high', 'block_ai');

INSERT INTO public.rate_limit_rules (name, target, endpoint_pattern, max_requests, window_seconds, action) VALUES
  ('Login por IP', 'ip', '/auth/login', 5, 60, 'block'),
  ('Login por e-mail', 'email', '/auth/login', 10, 3600, 'block'),
  ('Cadastro por IP', 'ip', '/auth/signup', 3, 3600, 'challenge'),
  ('Cadastro por telefone', 'phone', '/auth/signup', 2, 86400, 'block'),
  ('OTP WhatsApp — envio', 'phone', '/otp/send', 1, 60, 'block'),
  ('OTP WhatsApp — hora', 'phone', '/otp/send', 5, 3600, 'block'),
  ('OTP WhatsApp — verificação', 'phone', '/otp/verify', 10, 86400, 'block'),
  ('Reset de senha', 'email', '/auth/reset', 3, 3600, 'block'),
  ('Reset diário', 'email', '/auth/reset', 5, 86400, 'block'),
  ('Landing — leads', 'ip', '/api/public/leads', 5, 300, 'challenge'),
  ('WhatsApp inbound — minuto', 'phone', '/webhook/whatsapp', 20, 60, 'quarantine'),
  ('WhatsApp inbound — hora', 'phone', '/webhook/whatsapp', 100, 3600, 'quarantine');

-- ==================== AFFILIATES ====================
CREATE TYPE public.affiliate_type AS ENUM ('influencer','professional','clinic','partner','student','other');
CREATE TYPE public.affiliate_tier AS ENUM ('bronze','silver','gold','platinum');
CREATE TYPE public.affiliate_status AS ENUM ('pending','active','suspended','banned');
CREATE TYPE public.commission_status AS ENUM ('pending','available','paid','canceled');
CREATE TYPE public.payout_status AS ENUM ('draft','processing','paid','failed');
CREATE TYPE public.payout_method AS ENUM ('pix','ted','manual','other');
CREATE TYPE public.attribution_model AS ENUM ('first_click','last_click','coupon');
CREATE TYPE public.conversion_status AS ENUM ('pending','paid','refunded','canceled');

CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL, email text NOT NULL, phone text, document text,
  type public.affiliate_type NOT NULL DEFAULT 'influencer',
  tier public.affiliate_tier NOT NULL DEFAULT 'bronze',
  status public.affiliate_status NOT NULL DEFAULT 'pending',
  slug text NOT NULL UNIQUE,
  pix_key text, pix_key_type text, bank_info jsonb,
  custom_commission_pct numeric(6,3),
  custom_commission_fixed numeric(12,2),
  cookie_days int NOT NULL DEFAULT 30,
  notes text, instagram text, website text,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  suspended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliates_status ON public.affiliates(status);
CREATE INDEX idx_affiliates_tier ON public.affiliates(tier);
CREATE INDEX idx_affiliates_auth_user ON public.affiliates(auth_user_id);
GRANT SELECT ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage affiliates" ON public.affiliates FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate reads own" ON public.affiliates FOR SELECT USING (auth_user_id = auth.uid());
CREATE TRIGGER trg_affiliates_updated BEFORE UPDATE ON public.affiliates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  campaign text, destination_url text NOT NULL DEFAULT '/',
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  active boolean NOT NULL DEFAULT true,
  clicks_count int NOT NULL DEFAULT 0,
  leads_count int NOT NULL DEFAULT 0,
  conversions_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_links_affiliate ON public.affiliate_links(affiliate_id);
GRANT SELECT ON public.affiliate_links TO authenticated;
GRANT ALL ON public.affiliate_links TO service_role;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage links" ON public.affiliate_links FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate reads own links" ON public.affiliate_links FOR SELECT USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));
CREATE TRIGGER trg_affiliate_links_updated BEFORE UPDATE ON public.affiliate_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  link_id uuid REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  ip text, user_agent text, referer text, device text, country text, city text,
  fingerprint text, visitor_id text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_clicks_affiliate ON public.affiliate_clicks(affiliate_id, created_at DESC);
CREATE INDEX idx_affiliate_clicks_link ON public.affiliate_clicks(link_id);
CREATE INDEX idx_affiliate_clicks_visitor ON public.affiliate_clicks(visitor_id);
GRANT SELECT ON public.affiliate_clicks TO authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin read clicks" ON public.affiliate_clicks FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own clicks" ON public.affiliate_clicks FOR SELECT USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));

CREATE TABLE public.affiliate_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  link_id uuid REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  click_id uuid REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text, phone text, name text,
  attribution_model public.attribution_model NOT NULL DEFAULT 'last_click',
  coupon_code text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_leads_affiliate ON public.affiliate_leads(affiliate_id, created_at DESC);
CREATE INDEX idx_affiliate_leads_workspace ON public.affiliate_leads(workspace_id);
GRANT SELECT ON public.affiliate_leads TO authenticated;
GRANT ALL ON public.affiliate_leads TO service_role;
ALTER TABLE public.affiliate_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin read leads" ON public.affiliate_leads FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own leads" ON public.affiliate_leads FOR SELECT USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));

CREATE TABLE public.affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.affiliate_leads(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  plan text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status public.conversion_status NOT NULL DEFAULT 'pending',
  attribution_model public.attribution_model NOT NULL DEFAULT 'last_click',
  coupon_code text,
  metadata jsonb NOT NULL DEFAULT '{}',
  paid_at timestamptz, refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_conversions_affiliate ON public.affiliate_conversions(affiliate_id, created_at DESC);
CREATE INDEX idx_affiliate_conversions_status ON public.affiliate_conversions(status);
GRANT SELECT ON public.affiliate_conversions TO authenticated;
GRANT ALL ON public.affiliate_conversions TO service_role;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage conversions" ON public.affiliate_conversions FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own conversions" ON public.affiliate_conversions FOR SELECT USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));
CREATE TRIGGER trg_affiliate_conversions_updated BEFORE UPDATE ON public.affiliate_conversions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.affiliate_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text, tier public.affiliate_tier, affiliate_type public.affiliate_type,
  percent numeric(6,3), fixed_amount numeric(12,2),
  recurring boolean NOT NULL DEFAULT false,
  max_recurrence_months int,
  active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_commission_rules TO authenticated;
GRANT ALL ON public.affiliate_commission_rules TO service_role;
ALTER TABLE public.affiliate_commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage rules" ON public.affiliate_commission_rules FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read rules" ON public.affiliate_commission_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_commission_rules_updated BEFORE UPDATE ON public.affiliate_commission_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  conversion_id uuid REFERENCES public.affiliate_conversions(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES public.affiliate_commission_rules(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  base_amount numeric(12,2),
  status public.commission_status NOT NULL DEFAULT 'pending',
  available_at date, paid_at timestamptz, payout_id uuid, notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_id, status);
CREATE INDEX idx_affiliate_commissions_status ON public.affiliate_commissions(status);
GRANT SELECT ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage commissions" ON public.affiliate_commissions FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own commissions" ON public.affiliate_commissions FOR SELECT USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));
CREATE TRIGGER trg_commissions_updated BEFORE UPDATE ON public.affiliate_commissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  status public.payout_status NOT NULL DEFAULT 'draft',
  method public.payout_method NOT NULL DEFAULT 'pix',
  reference text, receipt_url text,
  paid_at timestamptz,
  paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_payouts_affiliate ON public.affiliate_payouts(affiliate_id, created_at DESC);
GRANT SELECT ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage payouts" ON public.affiliate_payouts FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own payouts" ON public.affiliate_payouts FOR SELECT USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));
CREATE TRIGGER trg_payouts_updated BEFORE UPDATE ON public.affiliate_payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.affiliate_commissions ADD CONSTRAINT fk_commission_payout FOREIGN KEY (payout_id) REFERENCES public.affiliate_payouts(id) ON DELETE SET NULL;

CREATE TABLE public.affiliate_payout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.affiliate_payouts(id) ON DELETE CASCADE,
  commission_id uuid NOT NULL REFERENCES public.affiliate_commissions(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payout_items_payout ON public.affiliate_payout_items(payout_id);
GRANT SELECT ON public.affiliate_payout_items TO authenticated;
GRANT ALL ON public.affiliate_payout_items TO service_role;
ALTER TABLE public.affiliate_payout_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage payout items" ON public.affiliate_payout_items FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own payout items" ON public.affiliate_payout_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.affiliate_payouts p JOIN public.affiliates a ON a.id = p.affiliate_id WHERE p.id = payout_id AND a.auth_user_id = auth.uid()));

CREATE TABLE public.affiliate_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  max_uses int, uses_count int NOT NULL DEFAULT 0,
  valid_from timestamptz, valid_until timestamptz,
  applicable_plans text[],
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_coupons_affiliate ON public.affiliate_coupons(affiliate_id);
CREATE INDEX idx_affiliate_coupons_code ON public.affiliate_coupons(lower(code));
GRANT SELECT ON public.affiliate_coupons TO authenticated;
GRANT ALL ON public.affiliate_coupons TO service_role;
ALTER TABLE public.affiliate_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage coupons" ON public.affiliate_coupons FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own coupons" ON public.affiliate_coupons FOR SELECT USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.affiliate_coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.affiliate_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, description text,
  kind text NOT NULL DEFAULT 'image',
  url text, content text, tags text[],
  active boolean NOT NULL DEFAULT true,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_assets TO authenticated;
GRANT ALL ON public.affiliate_assets TO service_role;
ALTER TABLE public.affiliate_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage assets" ON public.affiliate_assets FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read assets" ON public.affiliate_assets FOR SELECT USING (affiliate_id IS NULL OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.affiliate_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.resolve_attribution(_visitor_id text, _coupon_code text DEFAULT NULL)
RETURNS TABLE(affiliate_id uuid, link_id uuid, click_id uuid, model public.attribution_model)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_aff uuid; v_link uuid; v_click uuid;
BEGIN
  IF _coupon_code IS NOT NULL AND length(_coupon_code) > 0 THEN
    SELECT c.affiliate_id INTO v_aff FROM public.affiliate_coupons c WHERE lower(c.code) = lower(_coupon_code) AND c.active = true AND (c.valid_from IS NULL OR c.valid_from <= now()) AND (c.valid_until IS NULL OR c.valid_until >= now()) LIMIT 1;
    IF v_aff IS NOT NULL THEN RETURN QUERY SELECT v_aff, NULL::uuid, NULL::uuid, 'coupon'::public.attribution_model; RETURN; END IF;
  END IF;
  IF _visitor_id IS NOT NULL THEN
    SELECT cl.affiliate_id, cl.link_id, cl.id INTO v_aff, v_link, v_click FROM public.affiliate_clicks cl WHERE cl.visitor_id = _visitor_id AND cl.created_at > now() - interval '30 days' ORDER BY cl.created_at DESC LIMIT 1;
    IF v_aff IS NOT NULL THEN RETURN QUERY SELECT v_aff, v_link, v_click, 'last_click'::public.attribution_model; RETURN; END IF;
  END IF;
  RETURN;
END; $$;

CREATE OR REPLACE FUNCTION public.on_affiliate_click_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.affiliate_links SET clicks_count = clicks_count + 1, updated_at = now() WHERE id = NEW.link_id;
  INSERT INTO public.events (workspace_id, event_type, source, metadata) VALUES (NULL, 'affiliate.link_clicked', 'tracking', jsonb_build_object('affiliate_id', NEW.affiliate_id, 'link_id', NEW.link_id, 'click_id', NEW.id));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_on_affiliate_click AFTER INSERT ON public.affiliate_clicks FOR EACH ROW EXECUTE FUNCTION public.on_affiliate_click_insert();

CREATE OR REPLACE FUNCTION public.on_conversion_generate_commission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rule RECORD; v_aff RECORD; v_amount numeric(12,2); v_pct numeric(6,3); v_fixed numeric(12,2);
BEGIN
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN RETURN NEW; END IF;
  SELECT * INTO v_aff FROM public.affiliates WHERE id = NEW.affiliate_id;
  IF v_aff IS NULL THEN RETURN NEW; END IF;
  IF v_aff.custom_commission_pct IS NOT NULL OR v_aff.custom_commission_fixed IS NOT NULL THEN
    v_pct := coalesce(v_aff.custom_commission_pct, 0);
    v_fixed := coalesce(v_aff.custom_commission_fixed, 0);
    v_amount := round((NEW.amount * v_pct / 100.0) + v_fixed, 2);
    INSERT INTO public.affiliate_commissions (affiliate_id, conversion_id, amount, base_amount, status, available_at)
    VALUES (NEW.affiliate_id, NEW.id, v_amount, NEW.amount, 'pending', (current_date + interval '30 days')::date);
    RETURN NEW;
  END IF;
  SELECT * INTO v_rule FROM public.affiliate_commission_rules WHERE active = true AND (plan IS NULL OR plan = NEW.plan) AND (tier IS NULL OR tier = v_aff.tier) AND (affiliate_type IS NULL OR affiliate_type = v_aff.type) ORDER BY (plan IS NOT NULL)::int DESC, (tier IS NOT NULL)::int DESC, (affiliate_type IS NOT NULL)::int DESC, priority ASC LIMIT 1;
  IF v_rule IS NULL THEN RETURN NEW; END IF;
  v_amount := round((NEW.amount * coalesce(v_rule.percent,0) / 100.0) + coalesce(v_rule.fixed_amount,0), 2);
  IF v_amount <= 0 THEN RETURN NEW; END IF;
  INSERT INTO public.affiliate_commissions (affiliate_id, conversion_id, rule_id, amount, base_amount, status, available_at)
  VALUES (NEW.affiliate_id, NEW.id, v_rule.id, v_amount, NEW.amount, 'pending', (current_date + interval '30 days')::date);
  INSERT INTO public.events (workspace_id, event_type, source, metadata) VALUES (NEW.workspace_id, 'affiliate.commission_created', 'system', jsonb_build_object('affiliate_id', NEW.affiliate_id, 'conversion_id', NEW.id, 'amount', v_amount));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_on_conversion_paid_ins AFTER INSERT ON public.affiliate_conversions FOR EACH ROW EXECUTE FUNCTION public.on_conversion_generate_commission();
CREATE TRIGGER trg_on_conversion_paid_upd AFTER UPDATE OF status ON public.affiliate_conversions FOR EACH ROW EXECUTE FUNCTION public.on_conversion_generate_commission();

INSERT INTO public.affiliate_commission_rules (name, plan, percent, fixed_amount, priority) VALUES
  ('Free — sem comissão', 'free', 0, 0, 10),
  ('PRO Mensal — R$30 fixo', 'pro_monthly', 0, 30, 20),
  ('PRO Anual — R$100 fixo', 'pro_yearly', 0, 100, 20),
  ('Clínica — R$150 fixo', 'clinic', 0, 150, 20);

-- ==================== LEGAL ====================
CREATE TYPE public.legal_kind AS ENUM ('privacy','terms','cookies');

CREATE TABLE public.legal_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name text NOT NULL DEFAULT 'FisioFlow',
  legal_name text, cnpj text, address text, city text, state text, zip text,
  country text NOT NULL DEFAULT 'Brasil',
  jurisdiction text NOT NULL DEFAULT 'Comarca da Capital do Estado do responsável pelo tratamento',
  dpo_name text, dpo_email text,
  contact_email text, contact_phone text, website_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.legal_settings TO anon, authenticated;
GRANT ALL ON public.legal_settings TO service_role;
ALTER TABLE public.legal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read legal settings" ON public.legal_settings FOR SELECT USING (true);
CREATE POLICY "super admin manage legal settings" ON public.legal_settings FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_legal_settings_updated BEFORE UPDATE ON public.legal_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.legal_settings (id) VALUES (1);

CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.legal_kind NOT NULL,
  version int NOT NULL,
  title text NOT NULL, summary text, content_md text NOT NULL,
  effective_date date NOT NULL DEFAULT current_date,
  is_current boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, version)
);
CREATE INDEX idx_legal_docs_current ON public.legal_documents(kind) WHERE is_current = true;
GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT ALL ON public.legal_documents TO service_role;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read current legal" ON public.legal_documents FOR SELECT USING (is_current = true AND published_at IS NOT NULL);
CREATE POLICY "super admin manage legal docs" ON public.legal_documents FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_legal_docs_updated BEFORE UPDATE ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_single_current_legal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.legal_documents SET is_current = false WHERE kind = NEW.kind AND id <> NEW.id AND is_current = true;
    IF NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_single_current_legal BEFORE INSERT OR UPDATE OF is_current ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION public.ensure_single_current_legal();

INSERT INTO public.legal_documents (kind, version, title, summary, content_md, is_current, published_at) VALUES
('privacy', 1, 'Política de Privacidade', 'Como tratamos dados pessoais conforme a LGPD.', E'# Política de Privacidade\n\nVersão inicial. Edite pelo painel administrativo.', true, now()),
('terms', 1, 'Termos de Uso', 'Regras de uso da plataforma FisioFlow.', E'# Termos de Uso\n\nVersão inicial. Edite pelo painel administrativo.', true, now());

REVOKE ALL ON FUNCTION public.on_affiliate_click_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_conversion_generate_commission() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_attribution(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_single_current_legal() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_booking_request() FROM PUBLIC, anon, authenticated;
