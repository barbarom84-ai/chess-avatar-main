-- PvP matchmaking queue (one row per user, paired by time_preset via API).

create table if not exists public.pvp_matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  time_preset text not null,
  display_name text,
  created_at timestamptz not null default now(),
  constraint pvp_matchmaking_queue_user_unique unique (user_id)
);

create index if not exists pvp_matchmaking_queue_preset_created_idx
  on public.pvp_matchmaking_queue (time_preset, created_at);

alter table public.pvp_matchmaking_queue enable row level security;

drop policy if exists "pvp_matchmaking_select_own" on public.pvp_matchmaking_queue;
create policy "pvp_matchmaking_select_own"
  on public.pvp_matchmaking_queue for select
  using (auth.uid() = user_id);

drop policy if exists "pvp_matchmaking_insert_own" on public.pvp_matchmaking_queue;
create policy "pvp_matchmaking_insert_own"
  on public.pvp_matchmaking_queue for insert
  with check (auth.uid() = user_id);

drop policy if exists "pvp_matchmaking_delete_own" on public.pvp_matchmaking_queue;
create policy "pvp_matchmaking_delete_own"
  on public.pvp_matchmaking_queue for delete
  using (auth.uid() = user_id);

-- Realtime optional (status polling from client is sufficient for MVP).
