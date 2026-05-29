/*
  Multi-track campaigns for Ascension.

  Adds a `track` column to campaign_puzzles so a second, post-3000 Fantasy
  campaign can run its own sort_order sequence alongside the main campaign.
  Existing rows keep `track = 'main'`.
*/

ALTER TABLE campaign_puzzles
  ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'main'
    CHECK (track IN ('main', 'fantasy'));

-- Drop the old (is_published, sort_order) index in favour of a track-aware one.
DROP INDEX IF EXISTS idx_campaign_puzzles_published;
CREATE INDEX IF NOT EXISTS idx_campaign_puzzles_track_published
  ON campaign_puzzles(track, is_published, sort_order);
