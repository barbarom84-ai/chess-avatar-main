"use client";

import { useMemo } from "react";
import { PlayerChip } from "@/components/ArenaPlayoffBracket";
import {
  currentLeagueRound,
  leagueStandings,
  type ArenaLeagueGame,
  type ArenaLeagueState,
} from "@/lib/arena-league";
import { getOptionByKey } from "@/lib/arena-playoff-bracket";
import type { ProfileOption } from "@/lib/arena-types";
import { useLanguage } from "@/lib/language-context";

function formatPoints(points: number): string {
  const whole = Math.floor(points);
  if (points === whole) return String(whole);
  return whole === 0 ? "½" : `${whole}½`;
}

function resultLabel(g: ArenaLeagueGame): string {
  if (!g.result) return "–";
  return g.result === "1/2-1/2" ? "½-½" : g.result;
}

/** Standings plus the games of every round played so far (round-robin / Swiss). */
export default function ArenaLeagueTable({
  league,
  pool,
  liveGameId,
}: {
  league: ArenaLeagueState;
  pool: ProfileOption[];
  liveGameId: string | null;
}) {
  const { t } = useLanguage();
  const tp = t.arenaPlayoff;
  const standings = useMemo(() => leagueStandings(league), [league]);
  const current = currentLeagueRound(league);
  const rounds = useMemo(() => {
    const byRound = new Map<number, ArenaLeagueGame[]>();
    for (const g of league.games) {
      byRound.set(g.round, [...(byRound.get(g.round) ?? []), g]);
    }
    return [...byRound.entries()].sort((a, b) => b[0] - a[0]);
  }, [league.games]);

  return (
    <div className="space-y-3" data-testid="playoff-league">
      <p className="text-xs font-semibold text-amber-300">
        {tp.leagueRound
          .replace("{n}", String(current + 1))
          .replace("{total}", String(league.totalRounds))}
      </p>
      <div className="overflow-x-auto">
        <table className="arena-leaderboard">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{t.arenaPage.leaderboardAvatar}</th>
              <th scope="col">{tp.leaguePoints}</th>
              <th scope="col" title={t.arenaPage.leaderboardRecordHint}>
                {t.arenaPage.leaderboardRecord}
              </th>
              <th scope="col" title={league.format === "swiss" ? tp.tiebreakBuchholz : tp.tiebreakSb}>
                {tp.tiebreakShort}
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr key={row.key}>
                <td className="text-slate-500">{row.rank}</td>
                <td className="max-w-[11rem]">
                  <PlayerChip option={getOptionByKey(pool, row.key)} />
                </td>
                <td className="font-semibold text-slate-100">{formatPoints(row.points)}</td>
                <td className="whitespace-nowrap">
                  {row.wins} / {row.draws} / {row.losses}
                </td>
                <td>{formatPoints(row.tiebreak)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        {rounds.map(([round, games]) => (
          <details key={round} open={round === current} className="arena-league__round">
            <summary>
              {tp.leagueRound
                .replace("{n}", String(round + 1))
                .replace("{total}", String(league.totalRounds))}
            </summary>
            <ul className="space-y-1 pt-1">
              {games.map((g) => (
                <li
                  key={g.id}
                  className="arena-league__game"
                  data-live={g.id === liveGameId}
                  data-done={g.result != null}
                >
                  <PlayerChip option={getOptionByKey(pool, g.whiteKey)} />
                  <span className="font-mono text-[11px] text-slate-300">
                    {g.blackKey ? resultLabel(g) : tp.leagueBye}
                  </span>
                  {g.blackKey ? (
                    <PlayerChip option={getOptionByKey(pool, g.blackKey)} />
                  ) : (
                    <span />
                  )}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
