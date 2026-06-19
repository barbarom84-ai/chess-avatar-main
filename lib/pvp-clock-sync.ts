import type { Chess } from "chess.js";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import { replayGameFromUcis } from "@/lib/pvp-chess";

/** True when le dernier coup est en base mais l'horloge n'a pas encore basculé (race Realtime / API). */
export function isPvpClockBehindMoves(row: PvpGameRow, moves: PvpMoveRow[]): boolean {
  if (row.status !== "playing" || moves.length === 0) return false;
  if (row.clock_mode !== "timed" && row.clock_mode !== "correspondence") return false;
  const t0 = row.clock_turn_started_at;
  if (!t0) return false;
  const clockStart = new Date(t0).getTime();
  const lastMoveAt = Date.parse(moves[moves.length - 1]!.created_at);
  if (!Number.isFinite(clockStart) || !Number.isFinite(lastMoveAt)) return false;
  return lastMoveAt > clockStart + 250;
}

/** Position pour l'horloge : ignore le dernier coup si l'horloge serveur n'a pas encore suivi. */
export function chessForPvpClockAuthority(row: PvpGameRow, moves: PvpMoveRow[]): Chess {
  const ucis =
    isPvpClockBehindMoves(row, moves) && moves.length > 0
      ? moves.slice(0, -1).map((m) => m.uci)
      : moves.map((m) => m.uci);
  return replayGameFromUcis(ucis);
}
