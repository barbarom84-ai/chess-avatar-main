import type { PvpActiveGameSummary } from "@/lib/api-contract";

/** True when it is the given side's turn from the number of moves played (max ply). */
export function pvpActiveGameIsMyTurn(
  role: "white" | "black",
  moveCount: number
): boolean {
  return role === "white" ? moveCount % 2 === 0 : moveCount % 2 === 1;
}

/** Live games for the in-progress banner: the player's turn first, then the most recently updated. */
export function pickBannerGames(
  games: PvpActiveGameSummary[],
  viewedGameId: string | null
): PvpActiveGameSummary[] {
  return games
    .filter((g) => g.clock_mode === "timed" && g.id !== viewedGameId)
    .sort((a, b) => {
      if (a.is_my_turn !== b.is_my_turn) return a.is_my_turn ? -1 : 1;
      return Date.parse(b.updated_at) - Date.parse(a.updated_at);
    });
}
