-- =========================================================
-- Fase 1 — Integração BTZAP / WhatsApp Oficial
-- =========================================================

-- 1) btzap_config (single-row config)
CREATE TABLE public.btzap_config (
  id smallint PRIMARY KEY DEFAULT 1,
  token text,
  url_base text,
  webhook_secret text,
  endpoint_qr text NOT NULL DEFAULT '/instance/init',
  endpoint_status text NOT NULL DEFAULT '/instance/status',
  endpoint_disconnect text NOT NULL DEFAULT '/instance/disconnect',
  endpoint_send_text text NOT NULL DEFAULT '/message/text',
  instance_id text,
  connection_status text NOT NULL DEFAULT 'disconnected',
  qr_code text,
  phone_number text,
  profile_name text,
  last_check_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT btzap_config_singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.btzap_config TO authenticated;
GRANT ALL ON public.btzap_config TO service_role;

ALTER TABLE public.btzap_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage BTZAP config"
  ON public.btzap_config
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_btzap_config_updated_at
  BEFORE UPDATE ON public.btzap_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ensure singleton row exists
INSERT INTO public.btzap_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2) whatsapp_message_logs
CREATE TABLE public.whatsapp_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_number text NOT NULL,
  body text,
  template text,
  status text NOT NULL DEFAULT 'queued',
  external_id text,
  error text,
  related_type text,
  related_id uuid,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
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

CREATE POLICY "Super admins view WhatsApp logs"
  ON public.whatsapp_message_logs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins insert WhatsApp logs"
  ON public.whatsapp_message_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins update WhatsApp logs"
  ON public.whatsapp_message_logs
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_whatsapp_logs_updated_at
  BEFORE UPDATE ON public.whatsapp_message_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();