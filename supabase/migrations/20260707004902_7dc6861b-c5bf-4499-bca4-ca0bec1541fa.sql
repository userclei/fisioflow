
-- ============ CRM + Public Booking Links ============

-- Enums
DO $$ BEGIN CREATE TYPE public.crm_stage AS ENUM ('novo','contato','qualificado','agendado','convertido','perdido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.crm_source AS ENUM ('booking_link','manual','import','referral'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.crm_activity_type AS ENUM ('nota','ligacao','email','whatsapp','reuniao','outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ CRM LEADS ============
CREATE TABLE public.crm_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  source public.crm_source NOT NULL DEFAULT 'manual',
  stage public.crm_stage NOT NULL DEFAULT 'novo',
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  value_cents integer NOT NULL DEFAULT 0,
  last_contact_at timestamptz,
  next_action_at timestamptz,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_leads_ws_stage_idx ON public.crm_leads (workspace_id, stage);
CREATE INDEX crm_leads_ws_created_idx ON public.crm_leads (workspace_id, created_at DESC);
CREATE INDEX crm_leads_email_idx ON public.crm_leads (workspace_id, lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_leads_select ON public.crm_leads FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY crm_leads_insert ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY crm_leads_update ON public.crm_leads FOR UPDATE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY crm_leads_delete ON public.crm_leads FOR DELETE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER crm_leads_updated BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CRM ACTIVITIES ============
CREATE TABLE public.crm_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type public.crm_activity_type NOT NULL DEFAULT 'nota',
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_activities_lead_idx ON public.crm_activities (lead_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_activities_select ON public.crm_activities FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY crm_activities_insert ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY crm_activities_update ON public.crm_activities FOR UPDATE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY crm_activities_delete ON public.crm_activities FOR DELETE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));

-- ============ BOOKING LINKS ============
CREATE TABLE public.booking_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'Agendar reunião',
  description text,
  duration_min integer NOT NULL DEFAULT 30,
  buffer_min integer NOT NULL DEFAULT 0,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  working_days integer[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=Dom..6=Sáb
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',
  advance_days integer NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_links_time_valid CHECK (end_time > start_time),
  CONSTRAINT booking_links_slug_fmt CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,60}$')
);
CREATE INDEX booking_links_ws_idx ON public.booking_links (workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_links TO authenticated;
GRANT SELECT ON public.booking_links TO anon;
GRANT ALL ON public.booking_links TO service_role;

ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;
-- Public may read active links only (for the public booking page)
CREATE POLICY booking_links_public_select ON public.booking_links FOR SELECT TO anon USING (active = true);
CREATE POLICY booking_links_ws_select ON public.booking_links FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id) OR active = true);
CREATE POLICY booking_links_ws_insert ON public.booking_links FOR INSERT TO authenticated WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id) AND owner_user_id = auth.uid());
CREATE POLICY booking_links_ws_update ON public.booking_links FOR UPDATE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY booking_links_ws_delete ON public.booking_links FOR DELETE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER booking_links_updated BEFORE UPDATE ON public.booking_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BOOKING REQUESTS ============
CREATE TABLE public.booking_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_link_id uuid NOT NULL REFERENCES public.booking_links(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_name text NOT NULL,
  lead_email text,
  lead_phone text,
  notes text,
  scheduled_at timestamptz NOT NULL,
  duration_min integer NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX booking_requests_link_idx ON public.booking_requests (booking_link_id, scheduled_at);
CREATE INDEX booking_requests_ws_idx ON public.booking_requests (workspace_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY booking_requests_ws_select ON public.booking_requests FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY booking_requests_ws_update ON public.booking_requests FOR UPDATE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY booking_requests_ws_delete ON public.booking_requests FOR DELETE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
-- No public INSERT policy: bookings are created server-side via service_role after validation.

-- ============ TRIGGER: booking_request -> appointment + notification + event + crm lead ============
CREATE OR REPLACE FUNCTION public.handle_new_booking_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link RECORD;
  v_appt_id uuid;
  v_lead_id uuid;
  v_start time;
  v_end time;
  v_date date;
BEGIN
  SELECT * INTO v_link FROM public.booking_links WHERE id = NEW.booking_link_id;
  v_date := (NEW.scheduled_at AT TIME ZONE coalesce(v_link.timezone,'America/Sao_Paulo'))::date;
  v_start := (NEW.scheduled_at AT TIME ZONE coalesce(v_link.timezone,'America/Sao_Paulo'))::time;
  v_end := v_start + make_interval(mins => NEW.duration_min);

  -- Create appointment
  INSERT INTO public.appointments (
    workspace_id, professional_id, title, type, event_date, start_time, end_time, status, notes, created_by
  ) VALUES (
    NEW.workspace_id, NEW.owner_user_id,
    coalesce(v_link.title,'Reunião') || ' — ' || NEW.lead_name,
    'outro'::public.appointment_type,
    v_date, v_start, v_end, 'scheduled'::public.appointment_status,
    coalesce(NEW.notes,'') || E'\n\nContato: ' || coalesce(NEW.lead_email,'') || ' ' || coalesce(NEW.lead_phone,''),
    NEW.owner_user_id
  ) RETURNING id INTO v_appt_id;

  -- Upsert CRM lead (by email if present, else create new)
  IF NEW.lead_email IS NOT NULL AND length(NEW.lead_email) > 0 THEN
    SELECT id INTO v_lead_id FROM public.crm_leads
      WHERE workspace_id = NEW.workspace_id AND lower(email) = lower(NEW.lead_email) LIMIT 1;
  END IF;

  IF v_lead_id IS NULL THEN
    INSERT INTO public.crm_leads (workspace_id, owner_user_id, name, email, phone, source, stage, notes)
    VALUES (NEW.workspace_id, NEW.owner_user_id, NEW.lead_name, NEW.lead_email, NEW.lead_phone,
            'booking_link'::public.crm_source, 'agendado'::public.crm_stage, NEW.notes)
    RETURNING id INTO v_lead_id;
  ELSE
    UPDATE public.crm_leads SET stage='agendado', last_contact_at=now(), updated_at=now()
      WHERE id = v_lead_id;
  END IF;

  INSERT INTO public.crm_activities (lead_id, workspace_id, type, content, created_by)
  VALUES (v_lead_id, NEW.workspace_id, 'reuniao'::public.crm_activity_type,
    'Reunião agendada via link "' || coalesce(v_link.title,'') || '" para ' || to_char(NEW.scheduled_at,'DD/MM/YYYY HH24:MI'),
    NEW.owner_user_id);

  UPDATE public.booking_requests SET appointment_id = v_appt_id, lead_id = v_lead_id WHERE id = NEW.id;

  -- Notify the owner
  INSERT INTO public.notifications (workspace_id, user_id, title, message, type)
  VALUES (NEW.workspace_id, NEW.owner_user_id,
    'Nova reunião agendada',
    NEW.lead_name || ' agendou para ' || to_char(NEW.scheduled_at,'DD/MM/YYYY HH24:MI'),
    'booking');

  -- Event (for webhooks)
  INSERT INTO public.events (workspace_id, company_id, user_id, event_type, source, metadata)
  VALUES (NEW.workspace_id, NEW.workspace_id, NEW.owner_user_id, 'booking.created', 'public_booking',
    jsonb_build_object('booking_request_id', NEW.id, 'lead_name', NEW.lead_name, 'lead_email', NEW.lead_email,
      'scheduled_at', NEW.scheduled_at, 'appointment_id', v_appt_id, 'lead_id', v_lead_id));

  RETURN NEW;
END $$;

CREATE TRIGGER booking_request_after_insert
  AFTER INSERT ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_booking_request();
