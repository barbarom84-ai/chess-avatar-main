import type { Chess } from "chess.js";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import { replayGameFromUcis } from "@/lib/pvp-chess";
import { applyMoveClockUpdate } from "@/lib/pvp-clock-server";

export { chessForPvpClockAuthority, isPvpClockBehindMoves } from "@/lib/pvp-clock-sync";

/** Position pour l'horloge : coups confirmés uniquement (pas de pending / premove). */
export function chessForPvpClock(moves: PvpMoveRow[]): Chess {
  return replayGameFromUcis(moves.map((m) => m.uci));
}

/** Mise à jour locale de l'horloge au moment où un coup est enregistré (alignée serveur). */
export function optimisticGameClockAfterMove(
  game: PvpGameRow,
  movesBefore: PvpMoveRow[],
  nowMs: number
): Partial<PvpGameRow> {
  if (game.status !== "playing") return {};
  if (game.clock_mode !== "timed" && game.clock_mode !== "correspondence") return {};

  const chessBefore = replayGameFromUcis(movesBefore.map((m) => m.uci));
  const clock = applyMoveClockUpdate(game, chessBefore, nowMs);

  if (clock.kind === "timeout") {
    return {
      status: clock.patch.status,
      result: clock.patch.result,
      result_reason: clock.patch.result_reason,
      white_remaining_ms: clock.patch.white_remaining_ms,
      black_remaining_ms: clock.patch.black_remaining_ms,
      clock_turn_started_at: clock.patch.clock_turn_started_at,
      draw_offered_by: null,
    };
  }

  if (game.clock_mode === "timed") {
    return {
      white_remaining_ms: clock.white_remaining_ms,
      black_remaining_ms: clock.black_remaining_ms,
      clock_turn_started_at: clock.clock_turn_started_at,
    };
  }

  return { clock_turn_started_at: clock.clock_turn_started_at };
}
