
CREATE TABLE public.sticky_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'geral',
  color text NOT NULL DEFAULT 'yellow',
  priority text NOT NULL DEFAULT 'medium',
  is_pinned boolean NOT NULL DEFAULT false,
  is_important boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  reminder_at timestamptz,
  view_status text NOT NULL DEFAULT 'ideias',
  position integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'private',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sticky_notes TO authenticated;
GRANT ALL ON public.sticky_notes TO service_role;

ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;

-- Membros ativos do workspace podem ver notas do workspace se visibility='workspace' OU se forem o criador
CREATE POLICY "Read sticky notes in workspace"
  ON public.sticky_notes FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = sticky_notes.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
    AND (visibility = 'workspace' OR user_id = auth.uid())
  );

CREATE POLICY "Insert sticky notes in own workspace"
  ON public.sticky_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = sticky_notes.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

CREATE POLICY "Update own sticky notes"
  ON public.sticky_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own sticky notes"
  ON public.sticky_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_sticky_notes_workspace ON public.sticky_notes(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sticky_notes_user ON public.sticky_notes(user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER set_sticky_notes_updated_at
  BEFORE UPDATE ON public.sticky_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
