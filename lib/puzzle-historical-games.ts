import { loadHistoricalGames } from "@/lib/historical-games-loader";
import type { HistoricalGame } from "@/lib/opening-lessons";

/** Keep games that define at least one `MoveChallenge` (catalog mode list). */
export function filterGamesWithChallenges(
  games: Iterable<HistoricalGame>
): HistoricalGame[] {
  const out: HistoricalGame[] = [];
  for (const g of games) {
    if (g.challenges && g.challenges.length > 0) out.push(g);
  }
  return out;
}

/** All catalogue games that define at least one `MoveChallenge`. */
export function getHistoricalGamesWithChallenges(): HistoricalGame[] {
  const map = loadHistoricalGames();
  const flat: HistoricalGame[] = [];
  for (const games of map.values()) {
    for (const g of games) flat.push(g);
  }
  return filterGamesWithChallenges(flat);
}
