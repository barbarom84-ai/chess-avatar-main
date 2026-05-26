-- Update knight fantasy puzzle for Crazy Horse movement (diagonal slide + orthogonal leap).
UPDATE campaign_puzzles
SET
  fen = '8/8/8/8/4N3/8/8/2K2k2 w - - 0 1',
  solution_ucis = '["e4e6"]'::jsonb,
  fantasy_rules = '{"enabledAbilities":["knight_phantom"],"objective":"reach_square","objectiveSquare":"e6"}'::jsonb,
  prompt = '{"fr":"Cavalier fou (Crazy Horse) : atteignez e6","en":"Crazy Horse knight: reach e6"}'::jsonb,
  hints = '[{"fr":"Sautez de 2 cases verticalement (haut ou bas).","en":"Leap 2 squares vertically (up or down)."},{"fr":"Le cavalier glisse aussi en diagonale comme un fou.","en":"The knight also slides diagonally like a bishop."}]'::jsonb,
  insight = '{"fr":"Ne4-e6 — saut orthogonal de 2 cases.","en":"Ne4-e6 — 2-square orthogonal leap."}'::jsonb,
  is_published = true
WHERE slug = 'fan-001-knight-phantom';
