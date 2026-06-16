-- Allow authenticated users to read playing/finished PvP games and moves as spectators.

drop policy if exists "pvp_games_select_spectators" on public.pvp_games;
create policy "pvp_games_select_spectators"
  on public.pvp_games for select
  using (
    auth.uid() is not null
    and status in ('playing', 'finished')
  );

drop policy if exists "pvp_moves_select_spectators" on public.pvp_moves;
create policy "pvp_moves_select_spectators"
  on public.pvp_moves for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.pvp_games g
      where g.id = game_id
        and g.status in ('playing', 'finished')
    )
  );
