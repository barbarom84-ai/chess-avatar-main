-- PvP in-game chat messages

create table if not exists public.pvp_chat_messages (
  id bigserial primary key,
  game_id uuid not null references public.pvp_games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists pvp_chat_messages_game_id_created_at_idx
  on public.pvp_chat_messages (game_id, created_at);

alter table public.pvp_chat_messages enable row level security;

drop policy if exists "pvp_chat_select_participants" on public.pvp_chat_messages;
create policy "pvp_chat_select_participants"
  on public.pvp_chat_messages for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.pvp_games g
      where g.id = game_id
        and (g.white_user_id = auth.uid() or g.black_user_id = auth.uid())
    )
  );

drop policy if exists "pvp_chat_insert_participants" on public.pvp_chat_messages;
create policy "pvp_chat_insert_participants"
  on public.pvp_chat_messages for insert
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1 from public.pvp_games g
      where g.id = game_id
        and (g.white_user_id = auth.uid() or g.black_user_id = auth.uid())
        and g.status in ('waiting', 'playing')
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.pvp_chat_messages;
exception
  when duplicate_object then null;
end $$;
