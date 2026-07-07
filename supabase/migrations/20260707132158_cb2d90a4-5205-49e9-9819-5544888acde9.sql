-- =========================================================
-- Fase 2 — OTP, botões, templates, automação de cobrança
-- =========================================================

-- 1) Novos campos no btzap_config
ALTER TABLE public.btzap_config
  ADD COLUMN IF NOT EXISTS endpoint_send_buttons text NOT NULL DEFAULT '/message/buttons',
  ADD COLUMN IF NOT EXISTS endpoint_send_template text NOT NULL DEFAULT '/message/template',
  ADD COLUMN IF NOT EXISTS billing_automation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_days_before int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS billing_days_after int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS otp_enabled boolean NOT NULL DEFAULT true;

-- 2) whatsapp_otp_codes
CREATE TABLE public.whatsapp_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('login','reset','signup','verify')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text
);

CREATE INDEX idx_wpp_otp_phone_purpose ON public.whatsapp_otp_codes (phone, purpose, created_at DESC);
CREATE INDEX idx_wpp_otp_expires ON public.whatsapp_otp_codes (expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_otp_codes TO authenticated;
GRANT INSERT ON public.whatsapp_otp_codes TO anon;
GRANT ALL ON public.whatsapp_otp_codes TO service_role;

ALTER TABLE public.whatsapp_otp_codes ENABLE ROW LEVEL SECURITY;

-- Sem SELECT para anon/authenticated: verificação passa por server function com service_role.
CREATE POLICY "Nobody reads OTP client-side"
  ON public.whatsapp_otp_codes
  FOR SELECT
  TO authenticated
  USING (false);

-- 3) whatsapp_templates
CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  purpose text NOT NULL,
  body text NOT NULL,
  buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO authenticated;
GRANT ALL ON public.whatsapp_templates TO service_role;

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage templates"
  ON public.whatsapp_templates
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_wpp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Campos telefone em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone_e164);

-- 5) Seed templates iniciais
INSERT INTO public.whatsapp_templates (key, name, purpose, body, buttons, variables) VALUES
  (
    'cobranca_mensal',
    'Cobrança mensal',
    'billing',
    E'Olá {nome}! 👋\n\nSua mensalidade do FisioFlow está disponível:\n\n💰 Valor: R$ {valor}\n📅 Vencimento: {vencimento}\n\nToque no botão abaixo para pagar agora.',
    '[{"id":"pay","text":"Pagar agora","url":"{link_pagamento}"},{"id":"view","text":"Ver detalhes","url":"{link_fatura}"}]'::jsonb,
    '["nome","valor","vencimento","link_pagamento","link_fatura"]'::jsonb
  ),
  (
    'cobranca_vencida',
    'Cobrança vencida',
    'billing',
    E'Olá {nome},\n\n⚠️ Sua mensalidade venceu em {vencimento} e ainda não foi paga.\n\n💰 Valor: R$ {valor}\n\nPara evitar bloqueio da conta, regularize agora:',
    '[{"id":"pay","text":"Pagar agora","url":"{link_pagamento}"}]'::jsonb,
    '["nome","valor","vencimento","link_pagamento"]'::jsonb
  ),
  (
    'codigo_login',
    'Código de login',
    'otp_login',
    E'🔐 *FisioFlow*\n\nSeu código de acesso é:\n\n*{codigo}*\n\nExpira em 10 minutos. Se não foi você, ignore esta mensagem.',
    '[]'::jsonb,
    '["codigo"]'::jsonb
  ),
  (
    'codigo_reset',
    'Código de redefinição de senha',
    'otp_reset',
    E'🔑 *FisioFlow*\n\nCódigo para redefinir sua senha:\n\n*{codigo}*\n\nExpira em 10 minutos. Se não foi você, ignore.',
    '[]'::jsonb,
    '["codigo"]'::jsonb
  ),
  (
    'codigo_cadastro',
    'Confirmação de cadastro',
    'otp_signup',
    E'👋 Bem-vindo(a) ao FisioFlow!\n\nCódigo de confirmação:\n\n*{codigo}*\n\nExpira em 10 minutos.',
    '[]'::jsonb,
    '["codigo"]'::jsonb
  )
ON CONFLICT (key) DO NOTHING;