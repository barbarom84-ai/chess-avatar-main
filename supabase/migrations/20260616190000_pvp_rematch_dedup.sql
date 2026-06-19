-- Une seule revanche active par partie terminée (évite les doublons si les deux joueurs cliquent).
alter table public.pvp_games
  add column if not exists rematch_source_game_id uuid references public.pvp_games (id) on delete set null;

create unique index if not exists pvp_games_rematch_source_active_uidx
  on public.pvp_games (rematch_source_game_id)
  where rematch_source_game_id is not null
    and status in ('waiting', 'playing');

comment on column public.pvp_games.rematch_source_game_id is
  'Partie terminée dont cette revanche est issue.';
