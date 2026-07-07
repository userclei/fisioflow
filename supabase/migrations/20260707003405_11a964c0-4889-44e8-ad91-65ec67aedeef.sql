
-- =========================================================
-- 1. Enum extensions & platform admin infrastructure
-- =========================================================
ALTER TYPE public.workspace_status ADD VALUE IF NOT EXISTS 'overdue';
ALTER TYPE public.workspace_status ADD VALUE IF NOT EXISTS 'pending_payment';

-- Platform admins table (who is super_admin at the SaaS level)
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

CREATE POLICY platform_admins_self_select ON public.platform_admins
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY platform_admins_super_all ON public.platform_admins
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- =========================================================
-- 2. Extend existing tables
-- =========================================================
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS responsible_name text,
  ADD COLUMN IF NOT EXISTS responsible_email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS monthly_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS max_users int,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS last_access_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS monthly_price numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_day int DEFAULT 10,
  ADD COLUMN IF NOT EXISTS current_period_start date,
  ADD COLUMN IF NOT EXISTS current_period_end date,
  ADD COLUMN IF NOT EXISTS next_due_date date,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS auto_block_after_days int DEFAULT 7;

-- Super admin override policies
CREATE POLICY workspaces_super_admin_all ON public.workspaces
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY workspace_members_super_all ON public.workspace_members
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY subscriptions_super_all ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY profiles_super_select ON public.profiles
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY profiles_super_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY audit_super_select ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY audit_super_insert ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));

-- =========================================================
-- 3. Invoices
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM ('pending','paid','overdue','cancelled','refunded','manual_release');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  paid_at timestamptz,
  status public.invoice_status NOT NULL DEFAULT 'pending',
  payment_method text,
  external_payment_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_super_all ON public.invoices
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY invoices_ws_select ON public.invoices
  FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER set_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS invoices_workspace_idx ON public.invoices(workspace_id);
CREATE INDEX IF NOT EXISTS invoices_status_due_idx ON public.invoices(status, due_date);

-- =========================================================
-- 4. Events (tracking)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  source text NOT NULL DEFAULT 'app',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_super_all ON public.events
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY events_self_insert ON public.events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE INDEX IF NOT EXISTS events_type_created_idx ON public.events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS events_workspace_idx ON public.events(workspace_id, created_at DESC);

-- =========================================================
-- 5. Webhooks + deliveries
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.webhook_status AS ENUM ('active','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.delivery_status AS ENUM ('pending','success','failed','retrying');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  description text,
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
CREATE POLICY webhooks_super_all ON public.webhooks
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER set_webhooks_updated BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  url text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_status int,
  response_body text,
  status public.delivery_status NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_retry_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_deliveries_super_all ON public.webhook_deliveries
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS webhook_deliveries_pending_idx
  ON public.webhook_deliveries(status, next_retry_at) WHERE status IN ('pending','retrying');
CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_idx ON public.webhook_deliveries(webhook_id, created_at DESC);

-- =========================================================
-- 6. Admin settings (singleton)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  auto_block_after_days int NOT NULL DEFAULT 7,
  sandbox_enabled boolean NOT NULL DEFAULT true,
  pro_monthly_price numeric(10,2) NOT NULL DEFAULT 89.90,
  pro_yearly_price numeric(10,2) NOT NULL DEFAULT 899.00,
  support_email text,
  support_whatsapp text,
  webhooks_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_settings_super_all ON public.admin_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER set_admin_settings_updated BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.admin_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- =========================================================
-- 7. Event -> webhook dispatch trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.dispatch_event_webhooks()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  w RECORD;
  enabled boolean;
BEGIN
  SELECT webhooks_enabled INTO enabled FROM public.admin_settings WHERE id = 1;
  IF enabled IS FALSE THEN RETURN NEW; END IF;

  FOR w IN
    SELECT id, url FROM public.webhooks
    WHERE status = 'active'
      AND (NEW.event_type = ANY(events) OR '*' = ANY(events))
      AND (workspace_id IS NULL OR workspace_id = NEW.workspace_id)
  LOOP
    INSERT INTO public.webhook_deliveries (webhook_id, event_id, event_type, url, payload, status, next_retry_at)
    VALUES (w.id, NEW.id, NEW.event_type, w.url,
      jsonb_build_object(
        'event_id', NEW.id,
        'event_type', NEW.event_type,
        'workspace_id', NEW.workspace_id,
        'user_id', NEW.user_id,
        'metadata', NEW.metadata,
        'created_at', NEW.created_at
      ), 'pending', now());
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_event_webhooks ON public.events;
CREATE TRIGGER trg_dispatch_event_webhooks
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.dispatch_event_webhooks();

-- =========================================================
-- 8. Helper: record_event RPC
-- =========================================================
CREATE OR REPLACE FUNCTION public.record_event(
  _event_type text,
  _workspace_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _source text DEFAULT 'app'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.events (workspace_id, company_id, user_id, event_type, source, metadata)
  VALUES (_workspace_id, _workspace_id, auth.uid(), _event_type, _source, coalesce(_metadata,'{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_event(text, uuid, jsonb, text) TO authenticated;

-- =========================================================
-- 9. Overdue maintenance
-- =========================================================
CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  block_days int;
  rec RECORD;
BEGIN
  SELECT auto_block_after_days INTO block_days FROM public.admin_settings WHERE id = 1;
  block_days := coalesce(block_days, 7);

  UPDATE public.invoices
     SET status = 'overdue', updated_at = now()
   WHERE status = 'pending' AND due_date < current_date;

  UPDATE public.workspaces w
     SET status = 'overdue', updated_at = now()
    FROM public.invoices i
   WHERE i.workspace_id = w.id
     AND i.status = 'overdue'
     AND w.status = 'active';

  FOR rec IN
    SELECT DISTINCT w.id
      FROM public.workspaces w
      JOIN public.invoices i ON i.workspace_id = w.id
     WHERE i.status = 'overdue'
       AND (current_date - i.due_date) >= block_days
       AND w.status <> 'blocked'
  LOOP
    UPDATE public.workspaces SET status = 'blocked', updated_at = now() WHERE id = rec.id;
    INSERT INTO public.events (workspace_id, company_id, event_type, source, metadata)
    VALUES (rec.id, rec.id, 'company.blocked_by_overdue', 'system', jsonb_build_object('auto', true));
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_monthly_invoices()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r RECORD; next_due date;
BEGIN
  FOR r IN
    SELECT s.id AS sub_id, s.workspace_id, s.monthly_price, s.due_day, s.next_due_date
      FROM public.subscriptions s
      JOIN public.workspaces w ON w.id = s.workspace_id
     WHERE s.status IN ('active','trial')
       AND w.status IN ('active','trial','overdue','pending_payment')
  LOOP
    next_due := coalesce(r.next_due_date, make_date(extract(year from current_date)::int, extract(month from current_date)::int, coalesce(r.due_day,10)));
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE subscription_id = r.sub_id AND due_date = next_due) THEN
      INSERT INTO public.invoices (workspace_id, subscription_id, amount, due_date, status)
      VALUES (r.workspace_id, r.sub_id, coalesce(r.monthly_price,0), next_due, 'pending');
    END IF;
    UPDATE public.subscriptions SET next_due_date = (next_due + interval '1 month')::date WHERE id = r.sub_id;
  END LOOP;
END;
$$;
