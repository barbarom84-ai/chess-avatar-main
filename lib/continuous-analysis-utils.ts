import { Chess } from "chess.js";
import type { ContinuousAnalysisSnapshot } from "@/lib/stockfish-client";

export type TerminalAnalysisDisplay = {
  evalWhitePov: number;
  depth: number;
  lines: [];
  bestMoveUci: null;
};

/** Returns true if `uci` is a legal move in `fen`. */
export function isLegalUciMove(fen: string, uci: string): boolean {
  if (!uci || uci.length < 4) return false;
  try {
    const game = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const move = game.move(
      promotion ? { from, to, promotion } : { from, to }
    );
    return move !== null;
  } catch {
    return false;
  }
}

/** Keep only the legal prefix of a UCI PV from the given start FEN. */
export function legalPvPrefix(fen: string, pvUci: string[]): string[] {
  try {
    const game = new Chess(fen);
    const out: string[] = [];
    for (const uci of pvUci) {
      if (uci.length < 4) break;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const move = game.move(
        promotion ? { from, to, promotion } : { from, to }
      );
      if (!move) break;
      out.push(uci);
    }
    return out;
  } catch {
    return [];
  }
}

/** True when every PV line's first move is legal (or line is mate-only with no PV). */
export function snapshotMatchesFen(
  fen: string,
  snapshot: ContinuousAnalysisSnapshot
): boolean {
  for (const line of snapshot.lines) {
    const first = line.pvUci[0];
    if (!first) continue;
    if (!isLegalUciMove(fen, first)) return false;
  }
  return true;
}

export function sanitizeSnapshot(
  fen: string,
  snapshot: ContinuousAnalysisSnapshot
): ContinuousAnalysisSnapshot | null {
  if (!snapshotMatchesFen(fen, snapshot)) return null;

  const lines = snapshot.lines
    .map((line) => {
      const pvUci = legalPvPrefix(fen, line.pvUci);
      if (pvUci.length === 0 && !line.isMate) return null;
      return { ...line, pvUci };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);

  if (lines.length === 0) return null;

  const primary = lines[0]!;
  return {
    evalPawns: primary.evalPawns,
    depth: primary.depth,
    lines,
  };
}

/** Display for checkmate / stalemate / draw — no engine search needed. */
export function terminalAnalysisDisplay(
  fen: string
): TerminalAnalysisDisplay | null {
  try {
    const game = new Chess(fen);
    if (!game.isGameOver()) return null;

    if (game.isCheckmate()) {
      const whiteWins = game.turn() === "b";
      return {
        evalWhitePov: whiteWins ? 10 : -10,
        depth: 0,
        lines: [],
        bestMoveUci: null,
      };
    }

    return {
      evalWhitePov: 0,
      depth: 0,
      lines: [],
      bestMoveUci: null,
    };
  } catch {
    return null;
  }
}
