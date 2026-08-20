import type { PvpGameRow } from "@/lib/pvp-chess";

export type PvpHeadToHeadRecord = {
  wins: number;
  losses: number;
  draws: number;
  total: number;
};

/** Outcome for `viewerUserId` from a finished PvP row. */
export function pvpOutcomeForUser(
  game: Pick<PvpGameRow, "result" | "white_user_id" | "black_user_id">,
  viewerUserId: string
): "win" | "loss" | "draw" | null {
  const r = game.result;
  if (!r || r === "*") return null;
  const isWhite = game.white_user_id === viewerUserId;
  const isBlack = game.black_user_id === viewerUserId;
  if (!isWhite && !isBlack) return null;
  if (r === "1/2-1/2") return "draw";
  if (r === "1-0") return isWhite ? "win" : "loss";
  if (r === "0-1") return isBlack ? "win" : "loss";
  return null;
}

export function aggregateHeadToHead(
  games: Pick<PvpGameRow, "result" | "white_user_id" | "black_user_id">[],
  viewerUserId: string
): PvpHeadToHeadRecord {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const g of games) {
    const o = pvpOutcomeForUser(g, viewerUserId);
    if (o === "win") wins += 1;
    else if (o === "loss") losses += 1;
    else if (o === "draw") draws += 1;
  }
  return { wins, losses, draws, total: wins + losses + draws };
}
