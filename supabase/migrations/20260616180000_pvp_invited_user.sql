-- Invitation PvP ciblée : seul l'utilisateur invité peut rejoindre comme noirs.
alter table public.pvp_games
  add column if not exists invited_user_id uuid references auth.users (id) on delete set null;

create index if not exists pvp_games_invited_user_id_idx
  on public.pvp_games (invited_user_id)
  where invited_user_id is not null;

comment on column public.pvp_games.invited_user_id is
  'Joueur invité (noirs) ; la partie n''apparaît pas dans les salons publics.';
