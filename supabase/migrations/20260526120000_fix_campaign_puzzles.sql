/*
  Fix campaign puzzle content: coherent positions, prompts, and fantasy puzzles.
*/

DELETE FROM campaign_puzzles WHERE slug IN (
  'fan-001-knight-phantom',
  'std-003-fork'
);

INSERT INTO campaign_puzzles (
  slug, kind, min_elo, max_elo, xp_reward, elo_reward, fen, solution_ucis,
  fantasy_rules, prompt, hints, insight, sort_order, is_published
) VALUES
(
  'std-001-mate-in-1', 'standard', 0, 200, 15, 15,
  'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
  '["h5f7"]'::jsonb, '{}'::jsonb,
  '{"fr":"Mat en 1 coup","en":"Mate in 1"}'::jsonb,
  '[{"fr":"La dame peut donner mat sur f7.","en":"The queen can deliver mate on f7."}]'::jsonb,
  '{"fr":"Dxf7# — mat du berger.","en":"Qxf7# — scholar''s mate."}'::jsonb,
  1, true
),
(
  'std-002-mate-in-1', 'standard', 0, 250, 15, 15,
  '6k1/5ppp/8/8/8/8/5PPP/4R2K w - - 0 1',
  '["e1e8"]'::jsonb, '{}'::jsonb,
  '{"fr":"Mat de couloir — tour et roi","en":"Back rank mate — rook and king"}'::jsonb,
  '[{"fr":"La tour monte sur la 8e rangée avec le soutien du roi.","en":"The rook reaches the back rank with the king''s support."}]'::jsonb,
  '{"fr":"Te8# — mat de couloir.","en":"Re8# — back rank mate."}'::jsonb,
  2, true
),
(
  'std-003-win-pawn', 'standard', 15, 400, 20, 20,
  'r1bqkb1r/pppp2pp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
  '["f3e5"]'::jsonb, '{}'::jsonb,
  '{"fr":"Gagnez le pion central","en":"Win the central pawn"}'::jsonb,
  '[{"fr":"Le cavalier peut capturer le pion e5.","en":"The knight can capture the pawn on e5."}]'::jsonb,
  '{"fr":"Cxe5 — vous gagnez un pion.","en":"Nxe5 — you win a pawn."}'::jsonb,
  3, true
),
(
  'std-004-queen-mate', 'standard', 30, 500, 25, 25,
  '4K3/3k4/8/8/8/8/3Q4/8 w - - 0 1',
  '["d2d7"]'::jsonb, '{}'::jsonb,
  '{"fr":"Mat en 1 — dame et roi","en":"Mate in 1 — queen and king"}'::jsonb,
  '[{"fr":"La dame peut capturer sur d7 avec mat.","en":"The queen can capture on d7 with checkmate."}]'::jsonb,
  '{"fr":"Dxd7# — mat en un coup.","en":"Qxd7# — one-move mate."}'::jsonb,
  4, true
),
(
  'std-005-attack-f7', 'standard', 50, 600, 25, 25,
  'r1bqkb1r/pppp1ppp/2n2n2/4p2b/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3',
  '["c4f7"]'::jsonb, '{}'::jsonb,
  '{"fr":"Attaquez f7 avec le fou","en":"Attack f7 with the bishop"}'::jsonb,
  '[{"fr":"Le fou blanc vise la case f7.","en":"The white bishop targets f7."}]'::jsonb,
  '{"fr":"Fxf7+ — attaque décisive sur f7.","en":"Bxf7+ — decisive attack on f7."}'::jsonb,
  5, true
),
(
  'fan-001-bishop-orthogonal', 'fantasy', 60, 800, 35, 30,
  '8/8/8/8/4B3/8/8/2K2k2 w - - 0 1',
  '["e4e8"]'::jsonb,
  '{"enabledAbilities":["bishop_orthogonal"],"objective":"reach_square","objectiveSquare":"e8"}'::jsonb,
  '{"fr":"Pouvoir fantasy : fou orthogonal","en":"Fantasy power: orthogonal bishop"}'::jsonb,
  '[{"fr":"Le fou peut glisser verticalement comme une tour (pouvoir fantasy).","en":"The bishop can slide vertically like a rook (fantasy power)."}]'::jsonb,
  '{"fr":"Fe4-e8 en ligne droite — impossible en échecs classiques.","en":"Be4-e8 in a straight line — impossible in standard chess."}'::jsonb,
  6, true
),
(
  'fan-002-rook-tunnel', 'fantasy', 90, 900, 40, 35,
  '8/8/8/8/4R3/3P4/8/2K2k2 w - - 0 1',
  '["e4e8"]'::jsonb,
  '{"enabledAbilities":["rook_tunnel"],"objective":"reach_square","objectiveSquare":"e8"}'::jsonb,
  '{"fr":"Pouvoir fantasy : tour tunnel","en":"Fantasy power: tunnel rook"}'::jsonb,
  '[{"fr":"La tour traverse le pion allié sur e3.","en":"The rook passes through the friendly pawn on e3."}]'::jsonb,
  '{"fr":"Te4 traverse e3 pour atteindre e8.","en":"Re4 tunnels through e3 to reach e8."}'::jsonb,
  7, true
),
(
  'fan-003-pawn-charge', 'fantasy', 120, 1000, 45, 40,
  '8/8/8/8/8/3p4/3P4/3K2k1 w - - 0 1',
  '["d2d4"]'::jsonb,
  '{"enabledAbilities":["pawn_charge"],"objective":"reach_square","objectiveSquare":"d4"}'::jsonb,
  '{"fr":"Pouvoir fantasy : charge du pion","en":"Fantasy power: pawn charge"}'::jsonb,
  '[{"fr":"Le pion avance de deux cases malgré le blocage.","en":"The pawn advances two squares despite the block."}]'::jsonb,
  '{"fr":"d2-d4 en charge — règle fantasy uniquement.","en":"d2-d4 charge — fantasy rule only."}'::jsonb,
  8, true
),
(
  'fan-004-bishop-orthogonal-2', 'fantasy', 150, 1100, 45, 40,
  '8/8/8/8/8/1B6/8/1K3k2 w - - 0 1',
  '["b3b8"]'::jsonb,
  '{"enabledAbilities":["bishop_orthogonal"],"objective":"reach_square","objectiveSquare":"b8"}'::jsonb,
  '{"fr":"Pouvoir fantasy : fou en ligne droite","en":"Fantasy power: straight-line bishop"}'::jsonb,
  '[{"fr":"Le fou monte verticalement de b3 à b8.","en":"The bishop slides vertically from b3 to b8."}]'::jsonb,
  '{"fr":"Fb3-b8 — glisse orthogonale.","en":"Bb3-b8 — orthogonal slide."}'::jsonb,
  9, true
)
ON CONFLICT (slug) DO UPDATE SET
  kind = EXCLUDED.kind,
  min_elo = EXCLUDED.min_elo,
  max_elo = EXCLUDED.max_elo,
  xp_reward = EXCLUDED.xp_reward,
  elo_reward = EXCLUDED.elo_reward,
  fen = EXCLUDED.fen,
  solution_ucis = EXCLUDED.solution_ucis,
  fantasy_rules = EXCLUDED.fantasy_rules,
  prompt = EXCLUDED.prompt,
  hints = EXCLUDED.hints,
  insight = EXCLUDED.insight,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published;

UPDATE campaign_puzzles SET is_published = false
WHERE slug IN (
  'fan-001-knight-phantom',
  'std-003-fork',
  'std-004-back-rank',
  'fan-002-bishop-orthogonal',
  'fan-003-rook-tunnel',
  'fan-004-pawn-charge'
);
