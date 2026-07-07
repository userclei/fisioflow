REVOKE EXECUTE ON FUNCTION private.is_workspace_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.is_workspace_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_event(text, uuid, jsonb, text) FROM PUBLIC, anon;

DROP POLICY IF EXISTS affiliate_clicks_public_insert ON public.affiliate_clicks;
CREATE POLICY affiliate_clicks_public_insert ON public.affiliate_clicks FOR INSERT TO anon WITH CHECK (affiliate_id IS NOT NULL OR link_id IS NOT NULL);

DROP POLICY IF EXISTS affiliate_leads_public_insert ON public.affiliate_leads;
CREATE POLICY affiliate_leads_public_insert ON public.affiliate_leads FOR INSERT TO anon WITH CHECK (email IS NOT NULL OR phone IS NOT NULL);

DROP POLICY IF EXISTS landing_leads_public_insert ON public.landing_leads;
CREATE POLICY landing_leads_public_insert ON public.landing_leads FOR INSERT TO anon WITH CHECK (email IS NOT NULL AND name IS NOT NULL);

DROP POLICY IF EXISTS lgpd_requests_public_insert ON public.lgpd_requests;
CREATE POLICY lgpd_requests_public_insert ON public.lgpd_requests FOR INSERT TO anon WITH CHECK (requester_email IS NOT NULL AND request_type IS NOT NULL);

ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS auto_block_after_days int NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS pro_monthly_price numeric(10,2) NOT NULL DEFAULT 89.90,
  ADD COLUMN IF NOT EXISTS pro_yearly_price numeric(10,2) NOT NULL DEFAULT 899.00,
  ADD COLUMN IF NOT EXISTS sandbox_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS webhooks_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS support_whatsapp text;
INSERT INTO public.admin_settings(id, key, value, auto_block_after_days, pro_monthly_price, pro_yearly_price, sandbox_enabled, webhooks_enabled)
VALUES ('00000000-0000-0000-0000-000000000001', 'default', '{}'::jsonb, 7, 89.90, 899.00, true, true)
ON CONFLICT DO NOTHING;

ALTER TABLE public.landing_leads
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS usage_type text,
  ADD COLUMN IF NOT EXISTS message text;

ALTER TABLE public.legal_settings
  ADD COLUMN IF NOT EXISTS company_name text NOT NULL DEFAULT 'FisioFlow',
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS jurisdiction text NOT NULL DEFAULT 'Comarca da Capital',
  ADD COLUMN IF NOT EXISTS dpo_name text,
  ADD COLUMN IF NOT EXISTS dpo_email text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS website_url text;
INSERT INTO public.legal_settings(id, key, value, company_name, country, jurisdiction)
VALUES ('00000000-0000-0000-0000-000000000001', 'default', '{}'::jsonb, 'FisioFlow', 'Brasil', 'Comarca da Capital')
ON CONFLICT DO NOTHING;

ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS changelog text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS provider_invoice_id text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.webhooks
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
UPDATE public.webhooks SET status = CASE WHEN active THEN 'active' ELSE 'inactive' END WHERE status IS NULL;

ALTER TABLE public.webhook_deliveries
  ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

ALTER TABLE public.btzap_config
  ADD COLUMN IF NOT EXISTS endpoint_send_buttons text NOT NULL DEFAULT '/send/buttons',
  ADD COLUMN IF NOT EXISTS otp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_automation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_days_before int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS billing_days_after int NOT NULL DEFAULT 3;

ALTER TABLE public.whatsapp_message_logs
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS template text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz;

ALTER TABLE public.whatsapp_otp_codes
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'login',
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS used_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_attempts int NOT NULL DEFAULT 5;
ALTER TABLE public.whatsapp_otp_codes ALTER COLUMN expires_at SET DEFAULT (now() + interval '10 minutes');

ALTER TABLE public.affiliate_links ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS visitor_id text;

ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE public.blocked_identifiers ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.rate_limit_rules ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.prompt_injection_rules ADD COLUMN IF NOT EXISTS description text;