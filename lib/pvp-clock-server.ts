import type { Chess } from "chess.js";
import type { PvpGameRow } from "@/lib/pvp-chess";

export type TimeoutPatch = {
  status: "finished";
  result: string;
  result_reason: string;
  white_remaining_ms: number;
  black_remaining_ms: number;
  clock_turn_started_at: string;
  draw_offered_by: null;
};

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

  const elapsed = Math.max(0, nowMs - new Date(t0).getTime());

  if (row.clock_mode === "correspondence") {
    const budgetMs = moveBudgetMs(row);
    if (budgetMs <= 0) return null;
    return timeoutPatchForSide(row, chess, nowMs, elapsed, budgetMs);
  }

  const w = row.white_remaining_ms;
  const b = row.black_remaining_ms;
  if (w == null || b == null) return null;
  return timeoutPatchForSide(row, chess, nowMs, elapsed, 0);
}

/** Décompte + incrément Fischer (direct) ou reset du délai par coup (différé). */
export function applyMoveClockUpdate(
  row: PvpGameRow,
  chessBeforeMove: Chess,
  nowMs: number
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
    const t0 = row.clock_turn_started_at
      ? new Date(row.clock_turn_started_at).getTime()
      : nowMs;
    const elapsed = Math.max(0, nowMs - t0);
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
  const t0 = row.clock_turn_started_at
    ? new Date(row.clock_turn_started_at).getTime()
    : nowMs;
  const elapsed = Math.max(0, nowMs - t0);
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
