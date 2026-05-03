-- Distinction parties joueur vs avatar / arène bot vs bot
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_kind TEXT NOT NULL DEFAULT 'human_vs_bot';
ALTER TABLE games ADD COLUMN IF NOT EXISTS arena_configs JSONB;

COMMENT ON COLUMN games.game_kind IS 'human_vs_bot | arena_bot_vs_bot';
COMMENT ON COLUMN games.arena_configs IS 'Pour arène : { "white": EngineConfig, "black": EngineConfig }';

CREATE INDEX IF NOT EXISTS idx_games_game_kind ON games(user_id, game_kind);
