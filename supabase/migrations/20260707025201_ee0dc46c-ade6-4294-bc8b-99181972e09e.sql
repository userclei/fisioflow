CREATE TABLE public.landing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  whatsapp text,
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

-- Public may insert leads (captura pública). No SELECT for anon.
CREATE POLICY "Anyone can submit a landing lead"
  ON public.landing_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (source = 'landing_page');

-- Only platform admins can read the leads
CREATE POLICY "Platform admins can read landing leads"
  ON public.landing_leads FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Platform admins can delete landing leads"
  ON public.landing_leads FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));