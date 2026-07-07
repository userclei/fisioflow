-- ============================================================
-- MÓDULO DE AFILIADOS & INFLUENCIADORES — FASE 1
-- ============================================================

-- Enums
CREATE TYPE public.affiliate_type AS ENUM ('influencer','professional','clinic','partner','student','other');
CREATE TYPE public.affiliate_tier AS ENUM ('bronze','silver','gold','platinum');
CREATE TYPE public.affiliate_status AS ENUM ('pending','active','suspended','banned');
CREATE TYPE public.commission_status AS ENUM ('pending','available','paid','canceled');
CREATE TYPE public.payout_status AS ENUM ('draft','processing','paid','failed');
CREATE TYPE public.payout_method AS ENUM ('pix','ted','manual','other');
CREATE TYPE public.attribution_model AS ENUM ('first_click','last_click','coupon');
CREATE TYPE public.conversion_status AS ENUM ('pending','paid','refunded','canceled');

-- ============================================================
-- 1) AFFILIATES
-- ============================================================
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  document text, -- CPF/CNPJ
  type public.affiliate_type NOT NULL DEFAULT 'influencer',
  tier public.affiliate_tier NOT NULL DEFAULT 'bronze',
  status public.affiliate_status NOT NULL DEFAULT 'pending',
  slug text NOT NULL UNIQUE, -- código público
  pix_key text,
  pix_key_type text,
  bank_info jsonb,
  custom_commission_pct numeric(6,3),
  custom_commission_fixed numeric(12,2),
  cookie_days int NOT NULL DEFAULT 30,
  notes text,
  instagram text,
  website text,
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

CREATE POLICY "super admin manage affiliates" ON public.affiliates FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate reads own" ON public.affiliates FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE TRIGGER trg_affiliates_updated BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2) AFFILIATE_LINKS
-- ============================================================
CREATE TABLE public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  campaign text,
  destination_url text NOT NULL DEFAULT '/',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
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
CREATE POLICY "super admin manage links" ON public.affiliate_links FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate reads own links" ON public.affiliate_links FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));
CREATE TRIGGER trg_affiliate_links_updated BEFORE UPDATE ON public.affiliate_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3) AFFILIATE_CLICKS
-- ============================================================
CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  link_id uuid REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  ip text,
  user_agent text,
  referer text,
  device text,
  country text,
  city text,
  fingerprint text,
  visitor_id text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_clicks_affiliate ON public.affiliate_clicks(affiliate_id, created_at DESC);
CREATE INDEX idx_affiliate_clicks_link ON public.affiliate_clicks(link_id);
CREATE INDEX idx_affiliate_clicks_visitor ON public.affiliate_clicks(visitor_id);
GRANT SELECT ON public.affiliate_clicks TO authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin read clicks" ON public.affiliate_clicks FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own clicks" ON public.affiliate_clicks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));

-- ============================================================
-- 4) AFFILIATE_LEADS
-- ============================================================
CREATE TABLE public.affiliate_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  link_id uuid REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  click_id uuid REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  phone text,
  name text,
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
CREATE POLICY "super admin read leads" ON public.affiliate_leads FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own leads" ON public.affiliate_leads FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));

-- ============================================================
-- 5) AFFILIATE_CONVERSIONS
-- ============================================================
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
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_conversions_affiliate ON public.affiliate_conversions(affiliate_id, created_at DESC);
CREATE INDEX idx_affiliate_conversions_status ON public.affiliate_conversions(status);
GRANT SELECT ON public.affiliate_conversions TO authenticated;
GRANT ALL ON public.affiliate_conversions TO service_role;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage conversions" ON public.affiliate_conversions FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own conversions" ON public.affiliate_conversions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));
CREATE TRIGGER trg_affiliate_conversions_updated BEFORE UPDATE ON public.affiliate_conversions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6) AFFILIATE_COMMISSION_RULES
-- ============================================================
CREATE TABLE public.affiliate_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text, -- NULL = qualquer plano
  tier public.affiliate_tier, -- NULL = qualquer tier
  affiliate_type public.affiliate_type, -- NULL = qualquer
  percent numeric(6,3),
  fixed_amount numeric(12,2),
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
CREATE POLICY "super admin manage rules" ON public.affiliate_commission_rules FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read rules" ON public.affiliate_commission_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_commission_rules_updated BEFORE UPDATE ON public.affiliate_commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 7) AFFILIATE_COMMISSIONS
-- ============================================================
CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  conversion_id uuid REFERENCES public.affiliate_conversions(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES public.affiliate_commission_rules(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  base_amount numeric(12,2),
  status public.commission_status NOT NULL DEFAULT 'pending',
  available_at date,
  paid_at timestamptz,
  payout_id uuid,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_id, status);
CREATE INDEX idx_affiliate_commissions_status ON public.affiliate_commissions(status);
GRANT SELECT ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage commissions" ON public.affiliate_commissions FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own commissions" ON public.affiliate_commissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));
CREATE TRIGGER trg_commissions_updated BEFORE UPDATE ON public.affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 8) AFFILIATE_PAYOUTS
-- ============================================================
CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  status public.payout_status NOT NULL DEFAULT 'draft',
  method public.payout_method NOT NULL DEFAULT 'pix',
  reference text,
  receipt_url text,
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
CREATE POLICY "super admin manage payouts" ON public.affiliate_payouts FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own payouts" ON public.affiliate_payouts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));
CREATE TRIGGER trg_payouts_updated BEFORE UPDATE ON public.affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FK from commissions to payouts (adiciona depois de criar payouts)
ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT fk_commission_payout FOREIGN KEY (payout_id) REFERENCES public.affiliate_payouts(id) ON DELETE SET NULL;

-- ============================================================
-- 9) AFFILIATE_PAYOUT_ITEMS
-- ============================================================
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
CREATE POLICY "super admin manage payout items" ON public.affiliate_payout_items FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own payout items" ON public.affiliate_payout_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.affiliate_payouts p
    JOIN public.affiliates a ON a.id = p.affiliate_id
    WHERE p.id = payout_id AND a.auth_user_id = auth.uid()
  ));

-- ============================================================
-- 10) AFFILIATE_COUPONS
-- ============================================================
CREATE TABLE public.affiliate_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent', -- percent | fixed
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  max_uses int,
  uses_count int NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
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
CREATE POLICY "super admin manage coupons" ON public.affiliate_coupons FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read own coupons" ON public.affiliate_coupons FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.affiliate_coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 11) AFFILIATE_ASSETS
-- ============================================================
CREATE TABLE public.affiliate_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'image', -- image | video | text | pdf | link
  url text,
  content text,
  tags text[],
  active boolean NOT NULL DEFAULT true,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE, -- NULL = global
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_assets TO authenticated;
GRANT ALL ON public.affiliate_assets TO service_role;
ALTER TABLE public.affiliate_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage assets" ON public.affiliate_assets FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "affiliate read assets" ON public.affiliate_assets FOR SELECT
  USING (affiliate_id IS NULL OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.auth_user_id = auth.uid()));
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.affiliate_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- FUNCTION: resolve_attribution
-- Retorna affiliate_id conforme modelo global
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_attribution(
  _visitor_id text,
  _coupon_code text DEFAULT NULL
) RETURNS TABLE(affiliate_id uuid, link_id uuid, click_id uuid, model public.attribution_model)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aff uuid;
  v_link uuid;
  v_click uuid;
BEGIN
  -- 1) Cupom tem prioridade
  IF _coupon_code IS NOT NULL AND length(_coupon_code) > 0 THEN
    SELECT c.affiliate_id INTO v_aff
      FROM public.affiliate_coupons c
     WHERE lower(c.code) = lower(_coupon_code)
       AND c.active = true
       AND (c.valid_from IS NULL OR c.valid_from <= now())
       AND (c.valid_until IS NULL OR c.valid_until >= now())
     LIMIT 1;
    IF v_aff IS NOT NULL THEN
      RETURN QUERY SELECT v_aff, NULL::uuid, NULL::uuid, 'coupon'::public.attribution_model;
      RETURN;
    END IF;
  END IF;

  -- 2) Último clique nos últimos 30 dias
  IF _visitor_id IS NOT NULL THEN
    SELECT cl.affiliate_id, cl.link_id, cl.id INTO v_aff, v_link, v_click
      FROM public.affiliate_clicks cl
     WHERE cl.visitor_id = _visitor_id
       AND cl.created_at > now() - interval '30 days'
     ORDER BY cl.created_at DESC LIMIT 1;
    IF v_aff IS NOT NULL THEN
      RETURN QUERY SELECT v_aff, v_link, v_click, 'last_click'::public.attribution_model;
      RETURN;
    END IF;
  END IF;

  RETURN;
END;
$$;

-- ============================================================
-- TRIGGER: on_click_insert → evento
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_affiliate_click_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.affiliate_links SET clicks_count = clicks_count + 1, updated_at = now()
    WHERE id = NEW.link_id;
  INSERT INTO public.events (workspace_id, event_type, source, metadata)
  VALUES (NULL, 'affiliate.link_clicked', 'tracking',
    jsonb_build_object('affiliate_id', NEW.affiliate_id, 'link_id', NEW.link_id, 'click_id', NEW.id));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_on_affiliate_click AFTER INSERT ON public.affiliate_clicks
  FOR EACH ROW EXECUTE FUNCTION public.on_affiliate_click_insert();

-- ============================================================
-- TRIGGER: on_conversion_paid → gera comissão
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_conversion_generate_commission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rule RECORD;
  v_aff RECORD;
  v_amount numeric(12,2);
  v_pct numeric(6,3);
  v_fixed numeric(12,2);
BEGIN
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN RETURN NEW; END IF;

  SELECT * INTO v_aff FROM public.affiliates WHERE id = NEW.affiliate_id;
  IF v_aff IS NULL THEN RETURN NEW; END IF;

  -- Custom override no afiliado
  IF v_aff.custom_commission_pct IS NOT NULL OR v_aff.custom_commission_fixed IS NOT NULL THEN
    v_pct := coalesce(v_aff.custom_commission_pct, 0);
    v_fixed := coalesce(v_aff.custom_commission_fixed, 0);
    v_amount := round((NEW.amount * v_pct / 100.0) + v_fixed, 2);
    INSERT INTO public.affiliate_commissions (affiliate_id, conversion_id, amount, base_amount, status, available_at)
    VALUES (NEW.affiliate_id, NEW.id, v_amount, NEW.amount, 'pending', (current_date + interval '30 days')::date);
    RETURN NEW;
  END IF;

  -- Busca regra mais específica
  SELECT * INTO v_rule FROM public.affiliate_commission_rules
   WHERE active = true
     AND (plan IS NULL OR plan = NEW.plan)
     AND (tier IS NULL OR tier = v_aff.tier)
     AND (affiliate_type IS NULL OR affiliate_type = v_aff.type)
   ORDER BY
     (plan IS NOT NULL)::int DESC,
     (tier IS NOT NULL)::int DESC,
     (affiliate_type IS NOT NULL)::int DESC,
     priority ASC
   LIMIT 1;

  IF v_rule IS NULL THEN RETURN NEW; END IF;

  v_amount := round((NEW.amount * coalesce(v_rule.percent,0) / 100.0) + coalesce(v_rule.fixed_amount,0), 2);
  IF v_amount <= 0 THEN RETURN NEW; END IF;

  INSERT INTO public.affiliate_commissions (affiliate_id, conversion_id, rule_id, amount, base_amount, status, available_at)
  VALUES (NEW.affiliate_id, NEW.id, v_rule.id, v_amount, NEW.amount, 'pending', (current_date + interval '30 days')::date);

  INSERT INTO public.events (workspace_id, event_type, source, metadata)
  VALUES (NEW.workspace_id, 'affiliate.commission_created', 'system',
    jsonb_build_object('affiliate_id', NEW.affiliate_id, 'conversion_id', NEW.id, 'amount', v_amount));

  RETURN NEW;
END; $$;
CREATE TRIGGER trg_on_conversion_paid_ins AFTER INSERT ON public.affiliate_conversions
  FOR EACH ROW EXECUTE FUNCTION public.on_conversion_generate_commission();
CREATE TRIGGER trg_on_conversion_paid_upd AFTER UPDATE OF status ON public.affiliate_conversions
  FOR EACH ROW EXECUTE FUNCTION public.on_conversion_generate_commission();

-- ============================================================
-- SEED: regras padrão
-- ============================================================
INSERT INTO public.affiliate_commission_rules (name, plan, percent, fixed_amount, priority) VALUES
  ('Free — sem comissão', 'free', 0, 0, 10),
  ('PRO Mensal — R$30 fixo', 'pro_monthly', 0, 30, 20),
  ('PRO Anual — R$100 fixo', 'pro_yearly', 0, 100, 20),
  ('Clínica — R$150 fixo', 'clinic', 0, 150, 20);
