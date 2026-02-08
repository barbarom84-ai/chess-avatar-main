/*
  # Create Games Table

  1. New Tables
    - `games`
      - `id` (uuid, primary key) - Unique game identifier
      - `user_id` (uuid, foreign key) - References auth.users
      - `opponent_name` (text) - Opponent's name
      - `opponent_avatar` (text) - Opponent's avatar URL
      - `opponent_platform` (text) - Platform (lichess, chesscom, custom)
      - `result` (text) - Game result (win, loss, draw)
      - `result_type` (text) - How the game ended
      - `result_message` (text) - Result description
      - `player_color` (text) - Player's color (white or black)
      - `pgn` (text) - Full PGN notation
      - `final_fen` (text) - Final board position
      - `moves_count` (integer) - Number of moves
      - `duration_seconds` (integer) - Game duration
      - `captures_count` (integer) - Number of captures
      - `checks_count` (integer) - Number of checks
      - `best_eval` (decimal) - Best Stockfish evaluation
      - `worst_eval` (decimal) - Worst Stockfish evaluation
      - `avg_eval` (decimal) - Average Stockfish evaluation
      - `bot_config` (jsonb) - Bot configuration
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Indexes
    - Index on user_id for fast user lookups
    - Index on created_at for sorting
    - Index on result for filtering
    - Index on opponent_name for search
  
  3. Security
    - Enable RLS on games table
    - Users can only view their own games
    - Users can only insert their own games
    - Users can only update their own games
    - Users can only delete their own games
  
  4. Triggers
    - Auto-update updated_at timestamp on row updates
*/

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Opponent info
  opponent_name TEXT NOT NULL,
  opponent_avatar TEXT,
  opponent_platform TEXT,
  
  -- Result
  result TEXT NOT NULL,
  result_type TEXT NOT NULL,
  result_message TEXT,
  
  -- Player color
  player_color TEXT NOT NULL,
  
  -- Game data
  pgn TEXT NOT NULL,
  final_fen TEXT NOT NULL,
  moves_count INTEGER NOT NULL DEFAULT 0,
  
  -- Statistics
  duration_seconds INTEGER,
  captures_count INTEGER DEFAULT 0,
  checks_count INTEGER DEFAULT 0,
  
  -- Stockfish evaluation
  best_eval DECIMAL(10, 2),
  worst_eval DECIMAL(10, 2),
  avg_eval DECIMAL(10, 2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Bot config
  bot_config JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_result ON games(result);
CREATE INDEX IF NOT EXISTS idx_games_opponent_name ON games(opponent_name);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own games"
  ON games FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games"
  ON games FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own games"
  ON games FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_games_updated_at();
