import type { Chess } from "chess.js";
import type { PvpMoveRow } from "@/lib/pvp-chess";

/**
 * Reprise autorisée uniquement juste après votre coup, avant la réponse adverse :
 * - dernier coup joué par vous ;
 * - trait à l'adversaire (pas à vous).
 */
export function canOfferPvpTakeback(
  userId: string,
  role: "white" | "black",
  moves: Pick<PvpMoveRow, "played_by">[],
  chess: Chess
): boolean {
  if (moves.length === 0) return false;

  const lastMove = moves[moves.length - 1];
  if (lastMove.played_by !== userId) return false;

  const stm = chess.turn();
  const isMyTurn =
    (role === "white" && stm === "w") || (role === "black" && stm === "b");
  if (isMyTurn) return false;

  return true;
}

export function pvpGameJustStarted(
  prev: { status?: string; black_user_id?: string | null } | null | undefined,
  next: { status?: string; black_user_id?: string | null }
): boolean {
  return (
    next.status === "playing" &&
    Boolean(next.black_user_id) &&
    (!prev || prev.status !== "playing" || !prev.black_user_id)
  );
}
