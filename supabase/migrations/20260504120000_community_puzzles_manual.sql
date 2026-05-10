-- Manual community puzzles: relax mate depth, track source and curator.

ALTER TABLE community_puzzles DROP CONSTRAINT IF EXISTS community_puzzles_mate_attacker_moves_check;

ALTER TABLE community_puzzles ADD CONSTRAINT community_puzzles_mate_attacker_moves_check
  CHECK (mate_attacker_moves >= 2 AND mate_attacker_moves <= 64);

ALTER TABLE community_puzzles ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'index';

UPDATE community_puzzles SET source = 'index' WHERE source IS NULL OR source = '';

ALTER TABLE community_puzzles DROP CONSTRAINT IF EXISTS community_puzzles_source_check;

ALTER TABLE community_puzzles ADD CONSTRAINT community_puzzles_source_check
  CHECK (source IN ('index', 'manual'));

ALTER TABLE community_puzzles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN community_puzzles.source IS 'index = batch script; manual = curator UI/API';
COMMENT ON COLUMN community_puzzles.created_by IS 'Auth user who published a manual puzzle';
