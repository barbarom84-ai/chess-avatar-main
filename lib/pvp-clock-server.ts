import type { Chess } from "chess.js";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import { computeMoveTimeSpentMs } from "@/lib/pvp-move-time";
import { chessForPvpClockAuthority } from "@/lib/pvp-clock-sync";
import {
  PVP_CLOCK_START_PLIES,
  PVP_FIRST_MOVE_ABORT_MS,
  PVP_LAG_COMPENSATION_MAX_MS,
} from "@/lib/pvp-clock-rules";

export { PVP_CLOCK_START_PLIES, PVP_FIRST_MOVE_ABORT_MS, PVP_LAG_COMPENSATION_MAX_MS };

export type TimeoutPatch = {
  status: "finished" | "aborted";
  result: string;
  result_reason: string;
  white_remaining_ms: number;
  black_remaining_ms: number;
  clock_turn_started_at: string;
  draw_offered_by: null;
};

export type PvpClockPatch = Pick<
  PvpGameRow,
  "white_remaining_ms" | "black_remaining_ms" | "clock_turn_started_at"
>;

export function pvpClockRunning(chess: Chess): boolean {
  return chess.history().length >= PVP_CLOCK_START_PLIES;
}

/**
 * Part of the server-measured time that is network delay, given the thinking time the mover's
 * client measured (from seeing the opponent's move to sending its own).
 */
export function lagCompensationMs(elapsedMs: number, clientThinkMs: unknown): number {
  if (typeof clientThinkMs !== "number" || !Number.isFinite(clientThinkMs) || clientThinkMs < 0) {
    return 0;
  }
  return Math.min(PVP_LAG_COMPENSATION_MAX_MS, Math.max(0, elapsedMs - clientThinkMs));
}

function noFirstMovePatch(row: PvpGameRow, nowMs: number): TimeoutPatch {
  return {
    status: "aborted",
    result: "*",
    result_reason: "no_first_move",
    white_remaining_ms: Number(row.white_remaining_ms ?? 0),
    black_remaining_ms: Number(row.black_remaining_ms ?? 0),
    clock_turn_started_at: new Date(nowMs).toISOString(),
    draw_offered_by: null,
  };
}

function moveBudgetMs(row: PvpGameRow): number {
  if (row.clock_mode === "correspondence") {
    return Math.max(0, Number(row.clock_initial_sec ?? 0)) * 1000;
  }
  return 0;
}

function timeoutPatchForSide(
  row: PvpGameRow,
  chess: Chess,
  nowMs: number,
  elapsed: number,
  budgetMs: number
): TimeoutPatch | null {
  const stm = chess.turn();
  const w = Number(row.white_remaining_ms ?? 0);
  const b = Number(row.black_remaining_ms ?? 0);

  if (row.clock_mode === "correspondence") {
    if (elapsed < budgetMs) return null;
    if (stm === "w") {
      return {
        status: "finished",
        result: "0-1",
        result_reason: "timeout",
        white_remaining_ms: 0,
        black_remaining_ms: b,
        clock_turn_started_at: new Date(nowMs).toISOString(),
        draw_offered_by: null,
      };
    }
    return {
      status: "finished",
      result: "1-0",
      result_reason: "timeout",
      white_remaining_ms: w,
      black_remaining_ms: 0,
      clock_turn_started_at: new Date(nowMs).toISOString(),
      draw_offered_by: null,
    };
  }

  if (stm === "w") {
    if (w - elapsed > 0) return null;
    return {
      status: "finished",
      result: "0-1",
      result_reason: "timeout",
      white_remaining_ms: Math.max(0, w - elapsed),
      black_remaining_ms: b,
      clock_turn_started_at: new Date(nowMs).toISOString(),
      draw_offered_by: null,
    };
  }
  if (b - elapsed > 0) return null;
  return {
    status: "finished",
    result: "1-0",
    result_reason: "timeout",
    white_remaining_ms: w,
    black_remaining_ms: Math.max(0, b - elapsed),
    clock_turn_started_at: new Date(nowMs).toISOString(),
    draw_offered_by: null,
  };
}

/** Si le camp au trait a épuisé son temps, retourne la mise à jour à persister. */
export function checkTimeoutForTimedGame(
  row: PvpGameRow,
  chess: Chess,
  nowMs: number
): TimeoutPatch | null {
  if (row.status !== "playing") return null;
  if (row.clock_mode !== "timed" && row.clock_mode !== "correspondence") return null;

  const t0 = row.clock_turn_started_at;
  if (!t0) return null;

  const elapsed = computeMoveTimeSpentMs(t0, nowMs);

  if (row.clock_mode === "correspondence") {
    const budgetMs = moveBudgetMs(row);
    if (budgetMs <= 0) return null;
    return timeoutPatchForSide(row, chess, nowMs, elapsed, budgetMs);
  }

  const w = row.white_remaining_ms;
  const b = row.black_remaining_ms;
  if (w == null || b == null) return null;
  if (!pvpClockRunning(chess)) {
    return elapsed >= PVP_FIRST_MOVE_ABORT_MS ? noFirstMovePatch(row, nowMs) : null;
  }
  return timeoutPatchForSide(row, chess, nowMs, elapsed, 0);
}

/** Timeout check avec garde contre un décalage coup / horloge (race API ou Realtime). */
export function checkTimeoutForTimedGameWithMoves(
  row: PvpGameRow,
  moves: PvpMoveRow[],
  nowMs: number
): TimeoutPatch | null {
  const chess = chessForPvpClockAuthority(row, moves);
  return checkTimeoutForTimedGame(row, chess, nowMs);
}

/**
 * Décompte + incrément Fischer (direct) ou reset du délai par coup (différé).
 * `lagMs` (see [lagCompensationMs]) is refunded from the mover's elapsed time.
 */
export function applyMoveClockUpdate(
  row: PvpGameRow,
  chessBeforeMove: Chess,
  nowMs: number,
  lagMs = 0
):
  | { kind: "timeout"; patch: TimeoutPatch }
  | {
      kind: "tick";
      white_remaining_ms: number;
      black_remaining_ms: number;
      clock_turn_started_at: string;
    } {
  if (row.status !== "playing") {
    return {
      kind: "tick",
      white_remaining_ms: Number(row.white_remaining_ms ?? 0),
      black_remaining_ms: Number(row.black_remaining_ms ?? 0),
      clock_turn_started_at: new Date(nowMs).toISOString(),
    };
  }

  if (row.clock_mode === "correspondence") {
    const budgetMs = moveBudgetMs(row);
    const elapsed = computeMoveTimeSpentMs(row.clock_turn_started_at, nowMs);
    const timeout = timeoutPatchForSide(row, chessBeforeMove, nowMs, elapsed, budgetMs);
    if (timeout) {
      return { kind: "timeout", patch: timeout };
    }
    return {
      kind: "tick",
      white_remaining_ms: Number(row.white_remaining_ms ?? 0),
      black_remaining_ms: Number(row.black_remaining_ms ?? 0),
      clock_turn_started_at: new Date(nowMs).toISOString(),
    };
  }

  if (row.clock_mode !== "timed") {
    return {
      kind: "tick",
      white_remaining_ms: Number(row.white_remaining_ms ?? 0),
      black_remaining_ms: Number(row.black_remaining_ms ?? 0),
      clock_turn_started_at: new Date(nowMs).toISOString(),
    };
  }

  const w0 = Number(row.white_remaining_ms ?? 0);
  const b0 = Number(row.black_remaining_ms ?? 0);
  const rawElapsed = computeMoveTimeSpentMs(row.clock_turn_started_at, nowMs);
  if (!pvpClockRunning(chessBeforeMove)) {
    if (rawElapsed >= PVP_FIRST_MOVE_ABORT_MS) {
      return { kind: "timeout", patch: noFirstMovePatch(row, nowMs) };
    }
    return {
      kind: "tick",
      white_remaining_ms: w0,
      black_remaining_ms: b0,
      clock_turn_started_at: new Date(nowMs).toISOString(),
    };
  }
  const elapsed = Math.max(0, rawElapsed - Math.max(0, lagMs));
  const stm = chessBeforeMove.turn();
  const incMs = Math.max(0, Number(row.clock_increment_sec ?? 0)) * 1000;
  let w = w0;
  let b = b0;
  if (stm === "w") {
    w -= elapsed;
    if (w <= 0) {
      return {
        kind: "timeout",
        patch: {
          status: "finished",
          result: "0-1",
          result_reason: "timeout",
          white_remaining_ms: 0,
          black_remaining_ms: b0,
          clock_turn_started_at: new Date(nowMs).toISOString(),
          draw_offered_by: null,
        },
      };
    }
    w += incMs;
  } else {
    b -= elapsed;
    if (b <= 0) {
      return {
        kind: "timeout",
        patch: {
          status: "finished",
          result: "1-0",
          result_reason: "timeout",
          white_remaining_ms: w0,
          black_remaining_ms: 0,
          clock_turn_started_at: new Date(nowMs).toISOString(),
          draw_offered_by: null,
        },
      };
    }
    b += incMs;
  }
  return {
    kind: "tick",
    white_remaining_ms: w,
    black_remaining_ms: b,
    clock_turn_started_at: new Date(nowMs).toISOString(),
  };
}

/** Clocks frozen at `nowMs` when a live game ends without a move (resignation, agreed draw). */
export function finalClockPatch(row: PvpGameRow, chess: Chess, nowMs: number): Partial<PvpClockPatch> {
  if (row.status !== "playing" || row.clock_mode !== "timed") return {};
  if (row.white_remaining_ms == null || row.black_remaining_ms == null) return {};
  const at = new Date(nowMs).toISOString();
  const w = Number(row.white_remaining_ms);
  const b = Number(row.black_remaining_ms);
  if (!pvpClockRunning(chess)) {
    return { white_remaining_ms: w, black_remaining_ms: b, clock_turn_started_at: at };
  }
  const elapsed = computeMoveTimeSpentMs(row.clock_turn_started_at, nowMs);
  return chess.turn() === "w"
    ? { white_remaining_ms: Math.max(0, w - elapsed), black_remaining_ms: b, clock_turn_started_at: at }
    : { white_remaining_ms: w, black_remaining_ms: Math.max(0, b - elapsed), clock_turn_started_at: at };
}

/**
 * Clocks when the last move of `chessBeforeUndo` is taken back: the side to move is charged the time
 * it spent waiting on the request, and the mover loses the increment the undone move earned (it
 * gets it again when it replays). The mover's thinking time on the undone move stays spent.
 */
export function takebackClockUpdate(
  row: PvpGameRow,
  chessBeforeUndo: Chess,
  nowMs: number
): { kind: "timeout"; patch: TimeoutPatch } | { kind: "ok"; patch: Partial<PvpClockPatch> } {
  const at = new Date(nowMs).toISOString();
  if (row.status !== "playing" || row.clock_mode !== "timed") {
    return { kind: "ok", patch: { clock_turn_started_at: at } };
  }
  const timeout = checkTimeoutForTimedGame(row, chessBeforeUndo, nowMs);
  if (timeout) return { kind: "timeout", patch: timeout };

  const frozen = finalClockPatch(row, chessBeforeUndo, nowMs);
  let w = Number(frozen.white_remaining_ms ?? row.white_remaining_ms ?? 0);
  let b = Number(frozen.black_remaining_ms ?? row.black_remaining_ms ?? 0);
  const plies = chessBeforeUndo.history().length;
  if (plies > PVP_CLOCK_START_PLIES) {
    const incMs = Math.max(0, Number(row.clock_increment_sec ?? 0)) * 1000;
    if (chessBeforeUndo.turn() === "w") b = Math.max(0, b - incMs);
    else w = Math.max(0, w - incMs);
  }
  return { kind: "ok", patch: { white_remaining_ms: w, black_remaining_ms: b, clock_turn_started_at: at } };
}
