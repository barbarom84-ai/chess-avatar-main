import { Chess } from "chess.js";
import { stmEvalToWhitePov } from "@/lib/arena-spectator-helpers";

/** Raw Stockfish score from the side-to-move's perspective. */
export type EngineStmScore = {
  evalPawnsStm: number;
  isMate: boolean;
  /** Stockfish `score mate N` (positive = STM mates). */
  mateInMovesStm?: number;
};

/** Evaluation from White's perspective — what EvaluationBar expects. */
export type WhitePovEval = {
  evalWhitePov: number;
  isMate: boolean;
  /** Positive = White mates in N; negative = Black mates in N. */
  mateInMovesWhite?: number;
};

export function stmMateToWhitePov(fen: string, mateInMovesStm: number): number {
  try {
    return new Chess(fen).turn() === "w" ? mateInMovesStm : -mateInMovesStm;
  } catch {
    return mateInMovesStm;
  }
}

export function toWhitePovEval(fen: string, score: EngineStmScore): WhitePovEval {
  const evalWhitePov = stmEvalToWhitePov(fen, score.evalPawnsStm);
  if (!score.isMate || score.mateInMovesStm == null || score.mateInMovesStm === 0) {
    return { evalWhitePov, isMate: false };
  }
  return {
    evalWhitePov,
    isMate: true,
    mateInMovesWhite: stmMateToWhitePov(fen, score.mateInMovesStm),
  };
}

export function parseEngineScoreLine(line: string): EngineStmScore | null {
  const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
  if (mateMatch) {
    const mateIn = parseInt(mateMatch[1], 10);
    if (!Number.isFinite(mateIn) || mateIn === 0) return null;
    return {
      evalPawnsStm: mateIn > 0 ? 10 : -10,
      isMate: true,
      mateInMovesStm: mateIn,
    };
  }
  const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
  if (cpMatch) {
    const cp = parseInt(cpMatch[1], 10);
    if (!Number.isFinite(cp)) return null;
    return { evalPawnsStm: cp / 100, isMate: false };
  }
  return null;
}

/** Compact label: `M3` / `-M2` for mate, otherwise `+1.23`. */
export function formatEvalLabel(
  evalWhitePov: number,
  isMate?: boolean,
  mateInMovesWhite?: number
): string {
  if (isMate && mateInMovesWhite != null && mateInMovesWhite !== 0) {
    const n = Math.abs(mateInMovesWhite);
    return mateInMovesWhite > 0 ? `M${n}` : `-M${n}`;
  }
  if (isMate) {
    return evalWhitePov >= 0 ? "M" : "-M";
  }
  const v = Math.max(-99, Math.min(99, evalWhitePov));
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
}
