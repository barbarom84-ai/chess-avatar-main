/*
  # Activity events — product journal for admin ops + SQL analytics

  - Authenticated users insert their own rows (user_id = auth.uid()).
  - Super subscribers can read all rows (same gate as learn admin).
  - Service role (API routes) bypasses RLS.
*/

CREATE TABLE IF NOT EXISTS public.activity_events (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  session_id text,
  event_name text NOT NULL,
  path text,
  props jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS activity_events_created_at_idx
  ON public.activity_events (created_at DESC);

CREATE INDEX IF NOT EXISTS activity_events_name_created_idx
  ON public.activity_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_events_user_id_idx
  ON public.activity_events (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own activity events"
  ON public.activity_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Super users read all activity events"
  ON public.activity_events
  FOR SELECT
  TO authenticated
  USING (public.is_learn_super_editor(auth.uid()));

-- Realtime (enable in Dashboard if this fails on your project)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

COMMENT ON TABLE public.activity_events IS 'Client/product events; 90d retention recommended via scheduled purge.';
