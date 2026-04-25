/*
  # Create AI Coach Tables (contextual move explanations)

  Two tables back the in-app "AI Coach" that explains key moments of a game review.

  1. New Tables
    - `coach_explanations`
      - Public, immutable cache of LLM explanations keyed by a deterministic
        signature (FEN before move + UCI played + UCI best + cp loss bucket + lang + model).
      - Shared across users to amortize OpenAI cost.
      - `id` (uuid, primary key)
      - `cache_key` (text, unique) — sha-like signature documented above
      - `explanation` (text) — model output
      - `model` (text) — e.g. "gpt-4o-mini"
      - `prompt_tokens` (int), `completion_tokens` (int) — for usage tracking
      - `created_at` (timestamptz)

    - `coach_usage`
      - One row per (user, day) tracking the number of explanations consumed
        from this user's quota (only counts non-cache-hit calls for free users).
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK auth.users)
      - `day` (date, default current_date) — bucket key
      - `count` (int, default 0)
      - `created_at` (timestamptz), `updated_at` (timestamptz)
      - UNIQUE (user_id, day)

  2. Security
    - `coach_explanations`: any authenticated user can SELECT (public read cache);
      only the service role inserts (route uses service role to write).
    - `coach_usage`: users SELECT/UPDATE only their own row; service role writes.
*/

-- ===========================================================================
-- coach_explanations: shared LLM-output cache
-- ===========================================================================
CREATE TABLE IF NOT EXISTS coach_explanations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  explanation TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_explanations_cache_key
  ON coach_explanations(cache_key);

ALTER TABLE coach_explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read coach explanations"
  ON coach_explanations FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE intentionally not granted: only service role writes.

-- ===========================================================================
-- coach_usage: per-user daily quota counter
-- ===========================================================================
CREATE TABLE IF NOT EXISTS coach_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_coach_usage_user_day
  ON coach_usage(user_id, day);

ALTER TABLE coach_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coach usage"
  ON coach_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT/UPDATE handled exclusively by the API route via service-role key.
