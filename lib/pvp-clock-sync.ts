import type { Chess } from "chess.js";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import { replayGameFromUcis } from "@/lib/pvp-chess";

/** Below this, a move is too quick to tell a stale clock from a fresh one: trust the clock. */
const BEHIND_MIN_SPENT_MS = 1_000;

/**
 * True when le dernier coup est en base mais l'horloge n'a pas encore basculé (race Realtime / API).
 *
 * The move route writes the clock before inserting the move, and the insert lands a few hundred ms
 * later (cross-region round trips), so a fixed gap can't tell "behind" apart. A clock still on the
 * previous turn started `time_spent_ms` before the move; one written with the move started just
 * before its insert.
 */
export function isPvpClockBehindMoves(row: PvpGameRow, moves: PvpMoveRow[]): boolean {
  if (row.status !== "playing" || moves.length === 0) return false;
  if (row.clock_mode !== "timed" && row.clock_mode !== "correspondence") return false;
  const t0 = row.clock_turn_started_at;
  if (!t0) return false;
  const clockStart = new Date(t0).getTime();
  const last = moves[moves.length - 1]!;
  const lastMoveAt = Date.parse(last.created_at);
  if (!Number.isFinite(clockStart) || !Number.isFinite(lastMoveAt)) return false;
  const spent = last.time_spent_ms;
  if (spent == null || !Number.isFinite(spent) || spent < BEHIND_MIN_SPENT_MS) return false;
  return lastMoveAt - clockStart >= (spent * 3) / 4;
}

/** Position pour l'horloge : ignore le dernier coup si l'horloge serveur n'a pas encore suivi. */
export function chessForPvpClockAuthority(row: PvpGameRow, moves: PvpMoveRow[]): Chess {
  const ucis =
    isPvpClockBehindMoves(row, moves) && moves.length > 0
      ? moves.slice(0, -1).map((m) => m.uci)
      : moves.map((m) => m.uci);
  return replayGameFromUcis(ucis);
}
