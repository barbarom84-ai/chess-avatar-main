-- Temps de réflexion enregistré par coup (horloge au moment du POST /move).
alter table public.pvp_moves
  add column if not exists time_spent_ms integer check (time_spent_ms is null or time_spent_ms >= 0);

comment on column public.pvp_moves.time_spent_ms is
  'Milliseconds spent on this move (from clock_turn_started_at before increment).';
