
-- 1) Enums (idempotentes)
DO $$ BEGIN
  CREATE TYPE public.template_category AS ENUM (
    'reminder', 'due_today', 'overdue', 'negotiation', 'payment_confirmed', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_format AS ENUM ('text', 'html');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS category public.template_category NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS format   public.template_format   NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS description text;

DO $$ BEGIN
  CREATE TYPE public.dunning_trigger AS ENUM ('before_due', 'on_due', 'after_due');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dunning_channel AS ENUM ('whatsapp', 'email', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dunning_exec_status AS ENUM ('sent', 'failed', 'skipped', 'stopped', 'pending_provider');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) dunning_flows
CREATE TABLE IF NOT EXISTS public.dunning_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
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
DROP POLICY IF EXISTS "super admins manage dunning flows" ON public.dunning_flows;
CREATE POLICY "super admins manage dunning flows"
  ON public.dunning_flows FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_dunning_flows_updated ON public.dunning_flows;
CREATE TRIGGER trg_dunning_flows_updated BEFORE UPDATE ON public.dunning_flows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE UNIQUE INDEX IF NOT EXISTS uq_dunning_flows_default
  ON public.dunning_flows ((true)) WHERE is_default = true;

-- 3) dunning_flow_steps
CREATE TABLE IF NOT EXISTS public.dunning_flow_steps (
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
DROP POLICY IF EXISTS "super admins manage dunning steps" ON public.dunning_flow_steps;
CREATE POLICY "super admins manage dunning steps"
  ON public.dunning_flow_steps FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_dunning_steps_flow ON public.dunning_flow_steps(flow_id, order_index);
DROP TRIGGER IF EXISTS trg_dunning_steps_updated ON public.dunning_flow_steps;
CREATE TRIGGER trg_dunning_steps_updated BEFORE UPDATE ON public.dunning_flow_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) dunning_flow_assignments
CREATE TABLE IF NOT EXISTS public.dunning_flow_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.dunning_flows(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_flow_assignments TO authenticated;
GRANT ALL ON public.dunning_flow_assignments TO service_role;
ALTER TABLE public.dunning_flow_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "super admins manage dunning assignments" ON public.dunning_flow_assignments;
CREATE POLICY "super admins manage dunning assignments"
  ON public.dunning_flow_assignments FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_dunning_assign_workspace ON public.dunning_flow_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dunning_assign_plan ON public.dunning_flow_assignments(plan);

-- 5) dunning_executions
CREATE TABLE IF NOT EXISTS public.dunning_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES public.dunning_flows(id) ON DELETE SET NULL,
  step_id uuid REFERENCES public.dunning_flow_steps(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel public.dunning_channel NOT NULL DEFAULT 'whatsapp',
  status public.dunning_exec_status NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  error text,
  rendered_body text,
  message_log_id uuid REFERENCES public.whatsapp_message_logs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_executions TO authenticated;
GRANT ALL ON public.dunning_executions TO service_role;
ALTER TABLE public.dunning_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "super admins view dunning executions" ON public.dunning_executions;
CREATE POLICY "super admins view dunning executions"
  ON public.dunning_executions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE UNIQUE INDEX IF NOT EXISTS uq_dunning_exec_step_invoice
  ON public.dunning_executions(step_id, invoice_id)
  WHERE step_id IS NOT NULL AND invoice_id IS NOT NULL AND status IN ('sent','pending_provider');
CREATE INDEX IF NOT EXISTS idx_dunning_exec_invoice ON public.dunning_executions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dunning_exec_workspace_time ON public.dunning_executions(workspace_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_dunning_exec_status ON public.dunning_executions(status);

-- 6) Seed templates + fluxo padrão
DO $$
DECLARE
  v_flow uuid;
  t_reminder uuid;
  t_due uuid;
  t_overdue uuid;
  t_negotiation uuid;
  t_final uuid;
BEGIN
  INSERT INTO public.whatsapp_templates (key, name, purpose, body, category, format, description, active)
  VALUES ('dunning_reminder', 'Lembrete pré-vencimento', 'reminder',
    'Olá {{cliente}}! Sua mensalidade do FisioFlow de {{valor}} vence em {{dias_para_vencer}} dias ({{vencimento}}). Pague em: {{link_pagamento}}',
    'reminder', 'text', 'Enviado 3 dias antes do vencimento', true)
  ON CONFLICT (key) DO UPDATE SET category=EXCLUDED.category, format=EXCLUDED.format, description=EXCLUDED.description;

  INSERT INTO public.whatsapp_templates (key, name, purpose, body, category, format, description, active)
  VALUES ('dunning_due_today', 'Vence hoje', 'due_today',
    '⚠️ {{cliente}}, sua mensalidade de {{valor}} vence HOJE ({{vencimento}}). Evite o bloqueio: {{link_pagamento}}',
    'due_today', 'text', 'Enviado no dia do vencimento', true)
  ON CONFLICT (key) DO UPDATE SET category=EXCLUDED.category, format=EXCLUDED.format, description=EXCLUDED.description;

  INSERT INTO public.whatsapp_templates (key, name, purpose, body, category, format, description, active)
  VALUES ('dunning_overdue', 'Fatura vencida', 'overdue',
    '{{cliente}}, sua fatura de {{valor}} venceu há {{dias_atraso}} dia(s). Regularize agora: {{link_pagamento}}',
    'overdue', 'text', 'Enviado 1 dia após vencimento', true)
  ON CONFLICT (key) DO UPDATE SET category=EXCLUDED.category, format=EXCLUDED.format, description=EXCLUDED.description;

  INSERT INTO public.whatsapp_templates (key, name, purpose, body, category, format, description, active)
  VALUES ('dunning_negotiation', 'Proposta de negociação', 'negotiation',
    '{{cliente}}, sua fatura de {{valor}} está atrasada há {{dias_atraso}} dias. Podemos negociar? Fale conosco.',
    'negotiation', 'text', 'Enviado 3 dias após vencimento', true)
  ON CONFLICT (key) DO UPDATE SET category=EXCLUDED.category, format=EXCLUDED.format, description=EXCLUDED.description;

  INSERT INTO public.whatsapp_templates (key, name, purpose, body, category, format, description, active)
  VALUES ('dunning_final_notice', 'Aviso final antes do bloqueio', 'overdue',
    'ÚLTIMO AVISO — {{cliente}}, sua conta será bloqueada em breve. Débito: {{valor}} ({{dias_atraso}} dias). Regularize: {{link_pagamento}}',
    'overdue', 'text', 'Enviado 7 dias após vencimento', true)
  ON CONFLICT (key) DO UPDATE SET category=EXCLUDED.category, format=EXCLUDED.format, description=EXCLUDED.description;

  INSERT INTO public.whatsapp_templates (key, name, purpose, body, category, format, description, active)
  VALUES ('dunning_payment_confirmed', 'Confirmação de pagamento', 'payment_confirmed',
    '✅ Pagamento de {{valor}} confirmado, {{cliente}}! Obrigado.',
    'payment_confirmed', 'text', 'Enviado quando fatura é paga', true)
  ON CONFLICT (key) DO UPDATE SET category=EXCLUDED.category, format=EXCLUDED.format, description=EXCLUDED.description;

  IF NOT EXISTS (SELECT 1 FROM public.dunning_flows) THEN
    SELECT id INTO t_reminder    FROM public.whatsapp_templates WHERE key='dunning_reminder';
    SELECT id INTO t_due         FROM public.whatsapp_templates WHERE key='dunning_due_today';
    SELECT id INTO t_overdue     FROM public.whatsapp_templates WHERE key='dunning_overdue';
    SELECT id INTO t_negotiation FROM public.whatsapp_templates WHERE key='dunning_negotiation';
    SELECT id INTO t_final       FROM public.whatsapp_templates WHERE key='dunning_final_notice';

    INSERT INTO public.dunning_flows (name, description, is_default, is_active)
    VALUES ('Recuperação Padrão', 'Fluxo completo: lembrete → vencimento → cobrança → negociação → aviso final', true, true)
    RETURNING id INTO v_flow;

    INSERT INTO public.dunning_flow_steps (flow_id, order_index, trigger_type, offset_days, template_id, channel) VALUES
      (v_flow, 1, 'before_due', -3, t_reminder, 'whatsapp'),
      (v_flow, 2, 'on_due',      0, t_due, 'whatsapp'),
      (v_flow, 3, 'after_due',   1, t_overdue, 'whatsapp'),
      (v_flow, 4, 'after_due',   3, t_negotiation, 'whatsapp'),
      (v_flow, 5, 'after_due',   7, t_final, 'whatsapp');
  END IF;
END $$;
