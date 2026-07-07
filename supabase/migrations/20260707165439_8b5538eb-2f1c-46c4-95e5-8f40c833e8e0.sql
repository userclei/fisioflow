REVOKE ALL ON FUNCTION public.bootstrap_super_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dispatch_event_webhooks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_single_current_legal() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_monthly_invoices() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_booking_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_overdue_invoices() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_affiliate_click_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_conversion_generate_commission() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_event(text, uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_attribution(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS booking_links_public_select ON public.booking_links;
REVOKE SELECT ON public.booking_links FROM anon;

DROP POLICY IF EXISTS booking_links_ws_select ON public.booking_links;
CREATE POLICY booking_links_ws_select ON public.booking_links
  FOR SELECT TO authenticated
  USING (private.is_workspace_member(auth.uid(), workspace_id));

REVOKE INSERT ON public.booking_requests FROM anon, authenticated;