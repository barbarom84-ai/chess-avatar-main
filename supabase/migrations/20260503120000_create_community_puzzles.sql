/*
  Precomputed community puzzles (forced mate in 2 or 3 attacker moves).
  Access only via Supabase service role — no RLS policies for authenticated users.
*/

CREATE TABLE IF NOT EXISTS community_puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  ply_index INTEGER NOT NULL,
  mate_attacker_moves SMALLINT NOT NULL CHECK (mate_attacker_moves IN (2, 3)),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_id, ply_index)
);

CREATE INDEX IF NOT EXISTS idx_community_puzzles_game_id ON community_puzzles(game_id);

COMMENT ON TABLE community_puzzles IS 'Cloud puzzle pool: indexed forced-mate-in-2/3 positions from saved games.';
COMMENT ON COLUMN community_puzzles.payload IS 'CloudPuzzlePayload JSON (kind, gameId, opponentName, uciMoves, challenge).';

ALTER TABLE community_puzzles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION random_community_puzzle()
RETURNS SETOF community_puzzles
LANGUAGE sql
VOLATILE
AS $$
  SELECT * FROM community_puzzles ORDER BY random() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION random_community_puzzle() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION random_community_puzzle() TO postgres;
GRANT EXECUTE ON FUNCTION random_community_puzzle() TO service_role;
