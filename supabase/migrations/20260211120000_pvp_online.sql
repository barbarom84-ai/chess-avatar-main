-- Online PvP: games and moves. Run in Supabase SQL Editor or via CLI migrations.
-- Realtime: enable in Dashboard for tables `pvp_games` and `pvp_moves` if ADD fails on your project.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.pvp_game_status as enum ('waiting', 'playing', 'finished', 'aborted');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.pvp_games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete cascade,
  white_user_id uuid not null references auth.users (id) on delete cascade,
  black_user_id uuid references auth.users (id) on delete set null,
  status public.pvp_game_status not null default 'waiting',
  result text,
  result_reason text,
  draw_offered_by uuid references auth.users (id) on delete set null
);

create index if not exists pvp_games_white_user_id_idx on public.pvp_games (white_user_id);
create index if not exists pvp_games_black_user_id_idx on public.pvp_games (black_user_id);
create index if not exists pvp_games_status_idx on public.pvp_games (status);

create table if not exists public.pvp_moves (
  id bigserial primary key,
  game_id uuid not null references public.pvp_games (id) on delete cascade,
  ply integer not null check (ply > 0),
  uci text not null,
  played_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (game_id, ply)
);

create index if not exists pvp_moves_game_id_ply_idx on public.pvp_moves (game_id, ply);

create or replace function public.set_pvp_games_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pvp_games_set_updated_at on public.pvp_games;
create trigger pvp_games_set_updated_at
  before update on public.pvp_games
  for each row execute function public.set_pvp_games_updated_at();

alter table public.pvp_games enable row level security;
alter table public.pvp_moves enable row level security;

-- Participants read their games (join flow uses API; no open "waiting" scan).
drop policy if exists "pvp_games_select_participants" on public.pvp_games;
create policy "pvp_games_select_participants"
  on public.pvp_games for select
  using (
    auth.uid() is not null
    and (auth.uid() = white_user_id or auth.uid() = black_user_id)
  );

drop policy if exists "pvp_games_insert_creator" on public.pvp_games;
create policy "pvp_games_insert_creator"
  on public.pvp_games for insert
  with check (
    auth.uid() is not null
    and auth.uid() = created_by
    and auth.uid() = white_user_id
  );

-- Moves: read-only for participants (writes go through API + service role).
drop policy if exists "pvp_moves_select_participants" on public.pvp_moves;
create policy "pvp_moves_select_participants"
  on public.pvp_moves for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.pvp_games g
      where g.id = game_id
        and (g.white_user_id = auth.uid() or g.black_user_id = auth.uid())
    )
  );

-- Realtime publication (ignore if already member)
do $$
begin
  alter publication supabase_realtime add table public.pvp_moves;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.pvp_games;
exception
  when duplicate_object then null;
end $$;
