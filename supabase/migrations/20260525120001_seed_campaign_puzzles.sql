/*
  Seed campaign puzzles for Ascension mode (published).
*/

INSERT INTO campaign_puzzles (
  slug, kind, min_elo, max_elo, xp_reward, elo_reward, fen, solution_ucis,
  fantasy_rules, prompt, hints, insight, sort_order, is_published
) VALUES
(
  'std-001-mate-in-1', 'standard', 0, 200, 15, 15,
  'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
  '["h5f7"]'::jsonb, '{}'::jsonb,
  '{"fr":"Mat en 1 coup","en":"Mate in 1"}'::jsonb,
  '[{"fr":"La dame peut donner mat.","en":"The queen can deliver mate."}]'::jsonb,
  '{"fr":"Qxf7#","en":"Qxf7#"}'::jsonb,
  1, true
),
(
  'std-002-mate-in-1', 'standard', 0, 250, 15, 15,
  '7k/6pp/8/8/8/8/6Q1/6K1 w - - 0 1',
  '["g2g7"]'::jsonb, '{}'::jsonb,
  '{"fr":"Mat en 1 — tour et roi","en":"Mate in 1 — rook and king"}'::jsonb,
  '[{"fr":"La tour contrôle la huitième rangée.","en":"The rook controls the back rank."}]'::jsonb,
  '{"fr":"Rg8#","en":"Rg8#"}'::jsonb,
  2, true
),
(
  'std-003-fork', 'standard', 15, 400, 20, 20,
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  '["g1f3"]'::jsonb, '{}'::jsonb,
  '{"fr":"Développez avec une fourchette potentielle","en":"Develop with a potential fork"}'::jsonb,
  '[{"fr":"Le cavalier vise e5 et g5.","en":"The knight eyes e5 and g5."}]'::jsonb,
  '{"fr":"Cf3 — développement classique.","en":"Nf3 — classical development."}'::jsonb,
  3, true
),
(
  'std-004-back-rank', 'standard', 30, 500, 25, 25,
  '6k1/5ppp/8/8/8/8/5PPP/4R2K w - - 0 1',
  '["e1e8"]'::jsonb, '{}'::jsonb,
  '{"fr":"Mat de corridor","en":"Back rank mate"}'::jsonb,
  '[{"fr":"Le roi noir est piégé par ses pions.","en":"The black king is trapped by its pawns."}]'::jsonb,
  '{"fr":"Mat de couloir classique.","en":"Classic back rank mate."}'::jsonb,
  4, true
),
(
  'std-005-pin', 'standard', 50, 600, 25, 25,
  'r1bqkbnr/pppp1ppp/2n5/4p2b/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3',
  '["c4f7"]'::jsonb, '{}'::jsonb,
  '{"fr":"Exploitez le fou cloué","en":"Exploit the pinned bishop"}'::jsonb,
  '[{"fr":"Le fou noir est cloué sur le roi.","en":"The black bishop is pinned to the king."}]'::jsonb,
  '{"fr":"Bxf7+ gagne du matériel.","en":"Bxf7+ wins material."}'::jsonb,
  5, true
),
(
  'fan-001-knight-phantom', 'fantasy', 0, 800, 35, 30,
  '8/8/8/3n4/8/8/4N3/3K1k2 w - - 0 1',
  '["e2c3"]'::jsonb,
  '{"enabledAbilities":["knight_phantom"],"objective":"reach_square","objectiveSquare":"c3"}'::jsonb,
  '{"fr":"Cavalier fantôme : atteignez c3","en":"Phantom knight: reach c3"}'::jsonb,
  '[{"fr":"Sautez par-dessus le cavalier noir.","en":"Leap over the black knight."}]'::jsonb,
  '{"fr":"Ne2 atteint c3.","en":"Ne2 reaches c3."}'::jsonb,
  10, true
),
(
  'fan-002-bishop-orthogonal', 'fantasy', 30, 900, 40, 35,
  '8/8/8/8/4B3/8/8/2K2k2 w - - 0 1',
  '["e4e8"]'::jsonb,
  '{"enabledAbilities":["bishop_orthogonal"],"objective":"reach_square","objectiveSquare":"e8"}'::jsonb,
  '{"fr":"Fou orthogonal : atteignez e8","en":"Orthogonal bishop: reach e8"}'::jsonb,
  '[{"fr":"Glissez verticalement.","en":"Slide vertically."}]'::jsonb,
  '{"fr":"Be4-e8.","en":"Be4-e8."}'::jsonb,
  11, true
),
(
  'fan-003-rook-tunnel', 'fantasy', 60, 1000, 45, 40,
  '8/8/8/8/4R3/3P4/8/2K2k2 w - - 0 1',
  '["e4e8"]'::jsonb,
  '{"enabledAbilities":["rook_tunnel"],"objective":"reach_square","objectiveSquare":"e8"}'::jsonb,
  '{"fr":"Tour tunnel : atteignez e8","en":"Tunnel rook: reach e8"}'::jsonb,
  '[{"fr":"Traversez le pion allié.","en":"Pass through the friendly pawn."}]'::jsonb,
  '{"fr":"Re4 traverse e3.","en":"Re4 tunnels e3."}'::jsonb,
  12, true
),
(
  'fan-004-pawn-charge', 'fantasy', 90, 1100, 45, 40,
  '8/8/8/8/8/3p4/3P4/3K2k1 w - - 0 1',
  '["d2d4"]'::jsonb,
  '{"enabledAbilities":["pawn_charge"],"objective":"reach_square","objectiveSquare":"d4"}'::jsonb,
  '{"fr":"Charge du pion : atteignez d4","en":"Pawn charge: reach d4"}'::jsonb,
  '[{"fr":"Avancez de deux cases.","en":"Advance two squares."}]'::jsonb,
  '{"fr":"d2-d4 charge.","en":"d2-d4 charge."}'::jsonb,
  13, true
)
ON CONFLICT (slug) DO UPDATE SET
  fen = EXCLUDED.fen,
  solution_ucis = EXCLUDED.solution_ucis,
  fantasy_rules = EXCLUDED.fantasy_rules,
  is_published = EXCLUDED.is_published;
