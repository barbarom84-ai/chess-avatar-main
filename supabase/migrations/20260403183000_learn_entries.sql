/*
  # Learn content (opening + lesson JSON) editable by super subscribers

  Public read; INSERT/UPDATE/DELETE only when subscriptions.plan = 'super' AND active.
*/

CREATE TABLE IF NOT EXISTS learn_entries (
  opening_id text PRIMARY KEY,
  opening_json jsonb NOT NULL,
  lesson_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learn_entries_updated_at ON learn_entries(updated_at DESC);

CREATE TRIGGER update_learn_entries_updated_at
  BEFORE UPDATE ON learn_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE learn_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read learn entries"
  ON learn_entries FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.is_learn_super_editor(check_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = check_uid
      AND s.plan = 'super'
      AND s.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_learn_super_editor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_learn_super_editor(uuid) TO authenticated;

CREATE POLICY "Super subscribers can insert learn entries"
  ON learn_entries FOR INSERT
  TO authenticated
  WITH CHECK (public.is_learn_super_editor(auth.uid()));

CREATE POLICY "Super subscribers can update learn entries"
  ON learn_entries FOR UPDATE
  TO authenticated
  USING (public.is_learn_super_editor(auth.uid()))
  WITH CHECK (public.is_learn_super_editor(auth.uid()));

CREATE POLICY "Super subscribers can delete learn entries"
  ON learn_entries FOR DELETE
  TO authenticated
  USING (public.is_learn_super_editor(auth.uid()));
