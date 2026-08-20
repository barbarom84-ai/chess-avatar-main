-- Horloges et cadences pour le PvP en ligne (exécuter après la migration initiale pvp).

alter table public.pvp_games
  add column if not exists clock_mode text not null default 'unlimited',
  add column if not exists clock_initial_sec integer not null default 0,
  add column if not exists clock_increment_sec integer not null default 0,
  add column if not exists time_preset text not null default 'unlimited',
  add column if not exists white_remaining_ms bigint,
  add column if not exists black_remaining_ms bigint,
  add column if not exists clock_turn_started_at timestamptz;

comment on column public.pvp_games.clock_mode is 'unlimited | timed';
comment on column public.pvp_games.time_preset is 'Identifiant de cadence (ex. blitz_5_3).';
