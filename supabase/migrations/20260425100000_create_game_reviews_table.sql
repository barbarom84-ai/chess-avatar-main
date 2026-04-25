/*
  # Create Game Reviews Table (Cached Premium Game Reviews)

  1. New Tables
    - `game_reviews`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - References auth.users
      - `pgn_hash` (text) - FNV-1a 32-bit hex of the source PGN, used as cache key
      - `result` (jsonb) - Serialized GameReviewResult (white/black accuracy, classifications, moves[])
      - `depth` (integer) - Stockfish search depth used for the review
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Users can SELECT/INSERT/DELETE only their own reviews
*/

CREATE TABLE IF NOT EXISTS game_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pgn_hash TEXT NOT NULL,
  result JSONB NOT NULL,
  depth INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, pgn_hash, depth)
);

CREATE INDEX IF NOT EXISTS idx_game_reviews_user_id ON game_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_game_reviews_lookup ON game_reviews(user_id, pgn_hash, depth);

ALTER TABLE game_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own game reviews"
  ON game_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game reviews"
  ON game_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own game reviews"
  ON game_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
