
DO $$ BEGIN
  CREATE TYPE public.whatsapp_message_type AS ENUM ('text','button','list');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS message_type public.whatsapp_message_type NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS footer_text text,
  ADD COLUMN IF NOT EXISTS list_button_text text,
  ADD COLUMN IF NOT EXISTS buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS list_sections jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.whatsapp_templates.buttons IS
  'Array de botões de resposta: [{"text":"Sim","id":"confirm_yes"}]';
COMMENT ON COLUMN public.whatsapp_templates.list_sections IS
  'Array de seções: [{"title":"Serviços","items":[{"text":"Consulta","id":"c1","description":"..."}]}]';
