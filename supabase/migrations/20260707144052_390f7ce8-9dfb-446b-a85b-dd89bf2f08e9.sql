
CREATE TABLE IF NOT EXISTS public.broadcasts (
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

CREATE POLICY "super_admin_all_broadcasts" ON public.broadcasts
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.broadcast_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  workspace_id uuid,
  phone text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  rendered_body text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_deliveries_bid ON public.broadcast_deliveries(broadcast_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_deliveries TO authenticated;
GRANT ALL ON public.broadcast_deliveries TO service_role;

ALTER TABLE public.broadcast_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_broadcast_deliveries" ON public.broadcast_deliveries
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
