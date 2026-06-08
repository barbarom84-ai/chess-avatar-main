/*
  # User account UI preferences (synced across devices)

  JSON blob on user_accounts — e.g. bot engine selection on /play.
*/

ALTER TABLE user_accounts
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_accounts.preferences IS 'Client UI prefs: { "botEngine": "auto"|"chessavatar"|"stockfish" }';
