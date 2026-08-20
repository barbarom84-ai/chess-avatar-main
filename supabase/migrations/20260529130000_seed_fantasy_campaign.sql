/*
  Seed the post-3000 Fantasy campaign (track = 'fantasy').

  These puzzles showcase the new special-square mechanics (tunnel, explosive).
  They unlock once the player reaches 3000 ELO or finishes the main campaign.
  Rewards grant XP (uncapped) while ELO stays capped at 3000.
*/

INSERT INTO campaign_puzzles (
  slug, kind, track, min_elo, max_elo, xp_reward, elo_reward, fen, solution_ucis,
  fantasy_rules, prompt, hints, insight, sort_order, is_published
) VALUES
(
  'fantasy-001-tunnel', 'fantasy', 'fantasy', 0, 3000, 60, 0,
  '6k1/8/4p3/8/R7/8/8/6K1 w - - 0 1',
  '["a4e4"]'::jsonb,
  '{"enabledAbilities":[],"objective":"reach_square","objectiveSquare":"e6","specialSquares":[{"square":"e4","type":"tunnel","linkTo":"e6"}]}'::jsonb,
  '{"fr":"Tunnel : traverse jusqu''en e6","en":"Tunnel: warp to e6"}'::jsonb,
  '[{"fr":"Pose la tour sur la case tunnel e4 : elle ressort en e6 et capture le pion.","en":"Land the rook on the e4 tunnel: it re-emerges on e6 and captures the pawn."}]'::jsonb,
  '{"fr":"La case tunnel téléporte la pièce de e4 vers e6 (capture incluse).","en":"The tunnel square teleports the piece from e4 to e6 (capture included)."}'::jsonb,
  1, true
),
(
  'fantasy-002-explosive', 'fantasy', 'fantasy', 0, 3000, 70, 0,
  '6k1/8/8/3q4/R7/8/8/6K1 w - - 0 1',
  '["a4e4"]'::jsonb,
  '{"enabledAbilities":[],"objective":"capture_piece","objectivePiece":"b:q","specialSquares":[{"square":"e4","type":"explosive"}]}'::jsonb,
  '{"fr":"Explosion : élimine la dame","en":"Explosion: blow up the queen"}'::jsonb,
  '[{"fr":"La case e4 est explosive : la tour qui y arrive détruit toutes les pièces adjacentes (sauf les rois).","en":"The e4 square is explosive: the arriving rook destroys all adjacent pieces (kings excluded)."}]'::jsonb,
  '{"fr":"Te4 déclenche l''explosion et emporte la dame en d5.","en":"Re4 triggers the blast and takes the queen on d5."}'::jsonb,
  2, true
),
(
  'fantasy-003-king-tunnel', 'fantasy', 'fantasy', 0, 3000, 80, 0,
  '6k1/8/8/8/8/8/8/4K3 w - - 0 1',
  '["e1e2"]'::jsonb,
  '{"enabledAbilities":[],"objective":"reach_square","objectiveSquare":"e7","specialSquares":[{"square":"e2","type":"tunnel","linkTo":"e7"}]}'::jsonb,
  '{"fr":"Tunnel royal : atteins e7","en":"Royal tunnel: reach e7"}'::jsonb,
  '[{"fr":"Avance le roi sur la case tunnel e2 : il réapparaît en e7.","en":"Step the king onto the e2 tunnel: it reappears on e7."}]'::jsonb,
  '{"fr":"Même le roi peut emprunter un tunnel — Re1-e2 ressort en e7.","en":"Even the king can take a tunnel — Ke1-e2 re-emerges on e7."}'::jsonb,
  3, true
)
ON CONFLICT (slug) DO UPDATE SET
  kind = EXCLUDED.kind,
  track = EXCLUDED.track,
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
