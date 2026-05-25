/*
  Champion Ascension mode: player card progression, skill tree, campaign puzzles.
*/

CREATE TABLE IF NOT EXISTS player_champion_cards (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Champion',
  avatar_url TEXT,
  class_key TEXT NOT NULL DEFAULT 'tactique',
  element TEXT NOT NULL DEFAULT 'neutral',
  elo INTEGER NOT NULL DEFAULT 0 CHECK (elo >= 0 AND elo <= 3000),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  tier TEXT NOT NULL DEFAULT 'stone' CHECK (
    tier IN ('stone', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'legendary')
  ),
  customization JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_champion_cards_elo ON player_champion_cards(elo DESC);

ALTER TABLE player_champion_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own champion card"
  ON player_champion_cards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own champion card"
  ON player_champion_cards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own champion card"
  ON player_champion_cards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS player_skill_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 1 CHECK (rank >= 1),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_player_skill_allocations_user ON player_skill_allocations(user_id);

ALTER TABLE player_skill_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skill allocations"
  ON player_skill_allocations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill allocations"
  ON player_skill_allocations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS campaign_puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('standard', 'fantasy')),
  min_elo INTEGER NOT NULL DEFAULT 0 CHECK (min_elo >= 0),
  max_elo INTEGER NOT NULL DEFAULT 3000 CHECK (max_elo <= 3000),
  xp_reward INTEGER NOT NULL DEFAULT 10 CHECK (xp_reward >= 0),
  elo_reward INTEGER NOT NULL DEFAULT 10 CHECK (elo_reward >= 0),
  fen TEXT NOT NULL,
  solution_ucis JSONB NOT NULL DEFAULT '[]'::jsonb,
  fantasy_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  prompt JSONB NOT NULL DEFAULT '{"fr":"","en":""}'::jsonb,
  hints JSONB NOT NULL DEFAULT '[]'::jsonb,
  insight JSONB NOT NULL DEFAULT '{"fr":"","en":""}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_puzzles_published ON campaign_puzzles(is_published, sort_order);

ALTER TABLE campaign_puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read published campaign puzzles"
  ON campaign_puzzles FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE TABLE IF NOT EXISTS player_puzzle_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  puzzle_id UUID NOT NULL REFERENCES campaign_puzzles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts >= 1),
  best_time_ms INTEGER CHECK (best_time_ms IS NULL OR best_time_ms >= 0),
  UNIQUE (user_id, puzzle_id)
);

CREATE INDEX IF NOT EXISTS idx_player_puzzle_completions_user ON player_puzzle_completions(user_id);

ALTER TABLE player_puzzle_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own puzzle completions"
  ON player_puzzle_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own puzzle completions"
  ON player_puzzle_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own puzzle completions"
  ON player_puzzle_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_champion_ascension_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS player_champion_cards_updated_at ON player_champion_cards;
CREATE TRIGGER player_champion_cards_updated_at
  BEFORE UPDATE ON player_champion_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_champion_ascension_updated_at();

DROP TRIGGER IF EXISTS campaign_puzzles_updated_at ON campaign_puzzles;
CREATE TRIGGER campaign_puzzles_updated_at
  BEFORE UPDATE ON campaign_puzzles
  FOR EACH ROW
  EXECUTE FUNCTION update_champion_ascension_updated_at();
