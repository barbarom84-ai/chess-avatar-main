-- Custom Ascension campaign tracks (admin-managed).

CREATE TABLE IF NOT EXISTS campaign_tracks (
  slug TEXT PRIMARY KEY,
  label JSONB NOT NULL DEFAULT '{"fr":"","en":""}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  layout TEXT NOT NULL DEFAULT 'sequential'
    CHECK (layout IN ('main', 'sequential')),
  unlock_rule JSONB NOT NULL DEFAULT '{"type":"always"}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO campaign_tracks (slug, label, sort_order, layout, unlock_rule, is_system)
VALUES
  (
    'main',
    '{"fr":"Principale","en":"Main"}'::jsonb,
    0,
    'main',
    '{"type":"always"}'::jsonb,
    true
  ),
  (
    'fantasy',
    '{"fr":"Fantasy","en":"Fantasy"}'::jsonb,
    1,
    'sequential',
    '{"type":"main_complete_or_elo","min_elo":3000}'::jsonb,
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- Allow arbitrary track slugs on puzzles (FK to campaign_tracks).
ALTER TABLE campaign_puzzles
  DROP CONSTRAINT IF EXISTS campaign_puzzles_track_check;

ALTER TABLE campaign_puzzles
  DROP CONSTRAINT IF EXISTS campaign_puzzles_track_fkey;

ALTER TABLE campaign_puzzles
  ADD CONSTRAINT campaign_puzzles_track_fkey
  FOREIGN KEY (track) REFERENCES campaign_tracks (slug)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_campaign_tracks_sort ON campaign_tracks (sort_order);

GRANT SELECT ON campaign_tracks TO authenticated;
GRANT ALL ON campaign_tracks TO service_role;

ALTER TABLE campaign_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_tracks_read ON campaign_tracks
  FOR SELECT TO authenticated
  USING (true);
