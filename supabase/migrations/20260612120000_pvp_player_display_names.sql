-- Noms d’affichage PvP (dénormalisés à la création / au join pour l’UI et les PGN).

alter table public.pvp_games
  add column if not exists white_display_name text,
  add column if not exists black_display_name text;

comment on column public.pvp_games.white_display_name is 'Libellé public du joueur blanc au moment de la création.';
comment on column public.pvp_games.black_display_name is 'Libellé public du joueur noir au moment du join.';
