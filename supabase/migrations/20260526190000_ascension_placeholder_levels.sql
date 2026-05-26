-- ---------------------------------------------------------------------------
-- Ascension campaign: placeholder levels 10-140
--
-- 7 tiers × 20 puzzles each = 140 total levels.
-- Levels 1-9 were seeded in earlier migrations.
-- Levels 10-140 are pre-structured here as unpublished standard placeholders
-- so the admin UI (sort_order buttons 1-140) is fully ready for content entry.
--
-- Distribution (informational, not enforced by this migration):
--   Stone    : levels  1-20  (tiers at puzzle count  0 / start)
--   Bronze   : levels 21-40  (tier milestone at 20 completions)
--   Silver   : levels 41-60  (tier milestone at 40 completions)
--   Gold     : levels 61-80  (tier milestone at 60 completions)
--   Platinum : levels 81-100 (tier milestone at 80 completions)
--   Diamond  : levels 101-120 (tier milestone at 100 completions)
--   Legendary: levels 121-140 (tier milestone at 120 completions)
-- ---------------------------------------------------------------------------

INSERT INTO campaign_puzzles (
  id,
  slug,
  kind,
  min_elo,
  max_elo,
  xp_reward,
  elo_reward,
  fen,
  solution_ucis,
  fantasy_rules,
  prompt,
  hints,
  insight,
  sort_order,
  is_published
)
SELECT
  gen_random_uuid(),
  'placeholder-level-' || n,
  'standard',
  0,
  9999,
  20,
  20,
  -- Simple placeholder FEN (starting position) — replace with real puzzle in admin
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  ARRAY[]::text[],
  '{}'::jsonb,
  jsonb_build_object(
    'fr', 'Niveau ' || n || ' — À compléter',
    'en', 'Level ' || n || ' — To complete'
  ),
  '[]'::jsonb,
  jsonb_build_object('fr', '', 'en', ''),
  n,
  false
FROM generate_series(10, 140) AS n
ON CONFLICT (slug) DO NOTHING;
