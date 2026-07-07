
-- Bootstrap: first ever user becomes super_admin
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.platform_admins LIMIT 1) THEN
    INSERT INTO public.platform_admins (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_bootstrap_admin ON auth.users;
CREATE TRIGGER on_auth_user_bootstrap_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_super_admin();

-- Also elevate current existing first user if none set yet
INSERT INTO public.platform_admins (user_id)
SELECT id FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.platform_admins)
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT DO NOTHING;

-- Lock down maintenance functions to service role
REVOKE ALL ON FUNCTION public.dispatch_event_webhooks() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.mark_overdue_invoices() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.generate_monthly_invoices() FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.bootstrap_super_admin() FROM PUBLIC, authenticated, anon;
