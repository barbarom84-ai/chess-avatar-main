/*
  PvP tournaments and leagues.
*/

CREATE TABLE IF NOT EXISTS pvp_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'registration'
    CHECK (status IN ('registration', 'active', 'completed', 'cancelled')),
  max_players INT DEFAULT 16 CHECK (max_players BETWEEN 4 AND 64),
  time_control_ms INT DEFAULT 300000,
  increment_ms INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pvp_tournament_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES pvp_tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  seed INT DEFAULT 0,
  score NUMERIC(5,1) DEFAULT 0,
  eliminated BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS pvp_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  season TEXT NOT NULL DEFAULT '2026-S1',
  min_elo INT DEFAULT 0,
  max_elo INT DEFAULT 3000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (name, season)
);

CREATE TABLE IF NOT EXISTS pvp_league_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES pvp_leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT DEFAULT 1200,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  draws INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (league_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pvp_tournaments_status ON pvp_tournaments(status);
CREATE INDEX IF NOT EXISTS idx_pvp_tournament_players_tournament ON pvp_tournament_players(tournament_id);

ALTER TABLE pvp_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_league_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tournaments"
  ON pvp_tournaments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tournaments"
  ON pvp_tournaments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update own tournaments"
  ON pvp_tournaments FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Tournament players visible to authenticated"
  ON pvp_tournament_players FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can join tournaments"
  ON pvp_tournament_players FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leagues readable by authenticated"
  ON pvp_leagues FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Standings readable by authenticated"
  ON pvp_league_standings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can upsert own standings"
  ON pvp_league_standings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON pvp_tournaments TO authenticated;
GRANT SELECT, INSERT ON pvp_tournament_players TO authenticated;
GRANT SELECT ON pvp_leagues TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pvp_league_standings TO authenticated;

-- Seed default league
INSERT INTO pvp_leagues (name, season, min_elo, max_elo)
VALUES ('Open League', '2026-S1', 0, 3000)
ON CONFLICT (name, season) DO NOTHING;
