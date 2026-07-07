
-- ============ TABLES ============

CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id uuid,
  phone text,
  ip_address text,
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
CREATE POLICY "super_admins_read_events" ON public.security_events FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TABLE public.blocked_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('ip','phone','email','user','workspace','device')),
  value_hash text NOT NULL,
  value_masked text NOT NULL,
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
CREATE POLICY "super_admins_manage_blocks" ON public.blocked_identifiers FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.rate_limit_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target text NOT NULL CHECK (target IN ('ip','user','phone','email','workspace','endpoint')),
  endpoint_pattern text NOT NULL DEFAULT '*',
  max_requests int NOT NULL,
  window_seconds int NOT NULL,
  action text NOT NULL DEFAULT 'block' CHECK (action IN ('log','challenge','block','quarantine')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_rules TO authenticated;
GRANT ALL ON public.rate_limit_rules TO service_role;
ALTER TABLE public.rate_limit_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_manage_ratelimit" ON public.rate_limit_rules FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.prompt_injection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pattern text NOT NULL,
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
CREATE POLICY "super_admins_manage_pi_rules" ON public.prompt_injection_rules FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','contained','resolved','false_positive')),
  source text NOT NULL CHECK (source IN ('web','api','whatsapp','admin','system')),
  affected_workspace_id uuid,
  affected_user_id uuid,
  affected_phone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_incidents TO authenticated;
GRANT ALL ON public.security_incidents TO service_role;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_manage_incidents" ON public.security_incidents FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.lgpd_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  requester_name text NOT NULL,
  requester_email text,
  requester_phone text,
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
CREATE POLICY "super_admins_manage_lgpd" ON public.lgpd_requests FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

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
  dpo_name text,
  dpo_email text,
  privacy_policy_url text,
  terms_url text,
  data_retention_days int NOT NULL DEFAULT 365,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.security_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT, INSERT, UPDATE ON public.security_settings TO authenticated;
GRANT ALL ON public.security_settings TO service_role;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_manage_sec_settings" ON public.security_settings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER trg_rate_limit_rules_updated BEFORE UPDATE ON public.rate_limit_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_pi_rules_updated BEFORE UPDATE ON public.prompt_injection_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_incidents_updated BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_lgpd_updated BEFORE UPDATE ON public.lgpd_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sec_settings_updated BEFORE UPDATE ON public.security_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED — Prompt Injection Rules ============
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

-- ============ SEED — Rate Limit Rules ============
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
