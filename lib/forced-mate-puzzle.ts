import { Chess } from "chess.js";
import { chessAtPly } from "@/lib/pgn-to-uci";

const INF = Number.POSITIVE_INFINITY;

/** Beyond this ply depth, treat as no forced mate (avoids stack overflow on pathological trees). */
const MAX_SEARCH_DEPTH = 48;

type MateSearchCtx = {
  memo: Map<string, number>;
  /** Positions currently on the DFS stack — detects transposition cycles before memo is filled. */
  visiting: Set<string>;
  /** When set, return INF if `performance.now()` reaches this (wall-clock budget per root search). */
  deadline?: number;
};

export type ForcedMateSearchOptions = {
  /** Abort search after this many ms. Omit for no time limit (full tree within depth cap). */
  maxSearchMs?: number;
};

function searchTimedOut(ctx: MateSearchCtx): boolean {
  return ctx.deadline !== undefined && performance.now() >= ctx.deadline;
}

function uciToFromTo(uci: string): { from: string; to: string; promotion?: string } | null {
  const m = uci.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/i);
  if (!m) return null;
  return { from: m[1], to: m[2], promotion: m[3]?.toLowerCase() };
}

function fenKey(chess: Chess): string {
  return chess.fen();
}

/**
 * Attacker to move: minimum number of attacker half-moves to force checkmate,
 * assuming defender replies optimally (maximizes distance).
 */
function attackDist(chess: Chess, attackerColor: "w" | "b", ctx: MateSearchCtx, depth: number): number {
  const key = fenKey(chess);
  const cached = ctx.memo.get(key);
  if (cached !== undefined) return cached;

  if (depth > MAX_SEARCH_DEPTH || searchTimedOut(ctx)) return INF;

  if (ctx.visiting.has(key)) return INF;

  if (chess.turn() !== attackerColor) {
    ctx.memo.set(key, INF);
    return INF;
  }

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    ctx.memo.set(key, INF);
    return INF;
  }

  ctx.visiting.add(key);
  let best = INF;
  let aborted = false;
  try {
    for (const m of moves) {
      if (searchTimedOut(ctx)) {
        aborted = true;
        break;
      }
      const next = new Chess(chess.fen());
      next.move(m);
      if (next.isCheckmate()) {
        best = Math.min(best, 1);
        continue;
      }
      const tail = additionalAttackerMoves(next, attackerColor, ctx, depth + 1);
      if (tail === INF) continue;
      best = Math.min(best, 1 + tail);
    }
  } finally {
    ctx.visiting.delete(key);
  }

  if (aborted) return INF;

  ctx.memo.set(key, best);
  return best;
}

/**
 * Defender to move: attacker needs this many half-moves to mate against best defense.
 */
function additionalAttackerMoves(
  chess: Chess,
  attackerColor: "w" | "b",
  ctx: MateSearchCtx,
  depth: number
): number {
  const key = fenKey(chess);
  const cached = ctx.memo.get(key);
  if (cached !== undefined) return cached;

  if (depth > MAX_SEARCH_DEPTH || searchTimedOut(ctx)) return INF;

  if (ctx.visiting.has(key)) return INF;

  if (chess.turn() === attackerColor) {
    ctx.memo.set(key, INF);
    return INF;
  }

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    ctx.memo.set(key, INF);
    return INF;
  }

  ctx.visiting.add(key);
  let worst = -INF;
  let aborted = false;
  try {
    for (const m of moves) {
      if (searchTimedOut(ctx)) {
        aborted = true;
        break;
      }
      const next = new Chess(chess.fen());
      next.move(m);
      const ad = attackDist(next, attackerColor, ctx, depth + 1);
      worst = Math.max(worst, ad);
    }
  } finally {
    ctx.visiting.delete(key);
  }

  if (aborted) return INF;

  const result = worst === -INF ? INF : worst;
  ctx.memo.set(key, result);
  return result;
}

/**
 * Total attacker half-moves to forced mate if the given side plays `guessUci` from `positionBefore`,
 * counting that move as the first attacker half-move when it delivers mate later in the tree.
 * Returns 1 if `guessUci` mates immediately; otherwise 1 + minimax depth after defender replies.
 */
export function forcedMateDistanceForPlayedMove(
  positionBefore: Chess,
  guessUci: string,
  options?: ForcedMateSearchOptions
): number | null {
  const parts = uciToFromTo(guessUci);
  if (!parts) return null;

  const attackerColor = positionBefore.turn();
  if (attackerColor !== "w" && attackerColor !== "b") return null;

  const after = new Chess(positionBefore.fen());
  let played: ReturnType<Chess["move"]>;
  try {
    played = after.move(parts);
    if (!played) return null;
  } catch {
    return null;
  }

  if (played.color !== attackerColor) return null;

  if (after.isCheckmate()) return 1;

  const maxMs = options?.maxSearchMs;
  const ctx: MateSearchCtx = {
    memo: new Map<string, number>(),
    visiting: new Set<string>(),
    deadline:
      maxMs !== undefined && maxMs > 0 ? performance.now() + maxMs : undefined,
  };
  const sub = additionalAttackerMoves(after, attackerColor, ctx, 0);
  if (sub === INF) return null;

  return 1 + sub;
}

/**
 * Uses minimax on the move tree (cycle-safe memo + depth cap).
 * Returns 2 or 3 when the played move starts a forced mate in exactly that many attacker half-moves.
 */
export function forcedMateTwoOrThreeForHistoricalPly(
  uciMoves: string[],
  plyIndex: number,
  options?: ForcedMateSearchOptions
): 2 | 3 | null {
  const chess = chessAtPly(uciMoves, plyIndex);
  if (!chess) return null;
  const uci = uciMoves[plyIndex]?.trim().toLowerCase();
  if (!uci || uci.length < 4) return null;

  const dist = forcedMateDistanceForPlayedMove(chess, uci, options);
  if (dist === 2 || dist === 3) return dist;
  return null;
}

/**
 * Cheap prefilter for indexing: check or capture reduces wasted minimax work.
 */
export function isCheckOrCaptureAtPly(uciMoves: string[], plyIndex: number): boolean {
  const chess = chessAtPly(uciMoves, plyIndex);
  if (!chess) return false;
  const uci = uciMoves[plyIndex]?.trim().toLowerCase();
  const parts = uci ? uciToFromTo(uci) : null;
  if (!parts) return false;
  try {
    const m = chess.move(parts);
    if (!m) return false;
    return !!m.captured || chess.inCheck();
  } catch {
    return false;
  }
}
