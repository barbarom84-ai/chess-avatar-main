-- Mutual takeback offers (same pattern as draw_offered_by).

alter table public.pvp_games
  add column if not exists takeback_offered_by uuid references auth.users (id) on delete set null;
