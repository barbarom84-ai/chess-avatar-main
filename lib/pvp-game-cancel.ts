import type { PvpGameRow } from "@/lib/pvp-chess";

/** Salon ou revanche en attente que l'utilisateur a créé(e). */
export function canUserCancelWaitingPvpGame(
  userId: string,
  game: Pick<PvpGameRow, "status" | "created_by">
): boolean {
  return game.status === "waiting" && game.created_by === userId;
}

export function isPvpRematchLobby(
  game: Pick<PvpGameRow, "rematch_source_game_id" | "black_user_id">
): boolean {
  return Boolean(game.rematch_source_game_id);
}
