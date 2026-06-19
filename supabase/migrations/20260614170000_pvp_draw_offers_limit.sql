-- Limite de propositions de nulle par joueur et par partie (3 max).
alter table public.pvp_games
  add column if not exists white_draw_offers_count integer not null default 0
    check (white_draw_offers_count >= 0),
  add column if not exists black_draw_offers_count integer not null default 0
    check (black_draw_offers_count >= 0);
