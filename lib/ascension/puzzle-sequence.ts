import { Chess } from "chess.js";
import { FantasyChessEngine } from "@/lib/ascension/fantasy-chess/engine";
import type { FantasyRuleSet } from "@/lib/ascension/fantasy-chess/types";
import { getSideToMoveFromFen } from "@/lib/ascension/fen-utils";

export type SolverColor = "w" | "b";

/** Color that must find the solution (side to move at puzzle start). */
export function getSolverColor(fen: string): SolverColor {
  return getSideToMoveFromFen(fen);
}

/** Puzzle fantasy rules: abilities apply only to the solver, not the opponent. */
export function withPuzzleFantasySide(
  fen: string,
  rules: FantasyRuleSet
): FantasyRuleSet {
  return {
    ...rules,
    fantasySide: rules.fantasySide ?? getSolverColor(fen),
  };
}

export function applyMoveToChess(chess: Chess, uci: string): boolean {
  const normalized = uci.trim().toLowerCase();
  if (normalized.length < 4) return false;
  const from = normalized.slice(0, 2);
  const to = normalized.slice(2, 4);
  const promotion = normalized.length > 4 ? (normalized[4] as "q" | "r" | "b" | "n") : undefined;
  try {
    const move = chess.move({ from, to, promotion });
    return !!move;
  } catch {
    return false;
  }
}

function sideToMoveAfterLine(
  fen: string,
  lineMoves: string[],
  fantasyRules?: FantasyRuleSet
): SolverColor | null {
  if (fantasyRules) {
    try {
      const engine = new FantasyChessEngine(fen, withPuzzleFantasySide(fen, fantasyRules));
      for (const uci of lineMoves) {
        if (!engine.applyMove(uci)) return null;
      }
      return engine.turn;
    } catch {
      return null;
    }
  }

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  for (const uci of lineMoves) {
    if (!applyMoveToChess(chess, uci)) return null;
  }
  return chess.turn();
}

/** Indices in solution_ucis that the solver must play. */
export function getPlayerMoveIndices(
  fen: string,
  solutionUcis: string[],
  fantasyRules?: FantasyRuleSet
): number[] {
  const solverColor = getSolverColor(fen);
  const indices: number[] = [];

  if (fantasyRules) {
    const engine = new FantasyChessEngine(fen, withPuzzleFantasySide(fen, fantasyRules));
    for (let i = 0; i < solutionUcis.length; i++) {
      if (getSideToMoveFromFen(engine.fen) === solverColor) {
        indices.push(i);
      }
      if (!engine.applyMove(solutionUcis[i]!)) break;
    }
    return indices;
  }

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return [];
  }

  for (let i = 0; i < solutionUcis.length; i++) {
    if (chess.turn() === solverColor) {
      indices.push(i);
    }
    if (!applyMoveToChess(chess, solutionUcis[i]!)) {
      break;
    }
  }
  return indices;
}

/** Player-only moves extracted from the full solution line. */
export function extractPlayerMoves(
  fen: string,
  solutionUcis: string[],
  fantasyRules?: FantasyRuleSet
): string[] {
  const indices = getPlayerMoveIndices(fen, solutionUcis, fantasyRules);
  return indices.map((i) => solutionUcis[i]!.trim().toLowerCase());
}

/** Validate that player moves match the solver plies in the full solution. */
export function validatePlayerSolution(
  fen: string,
  solutionUcis: string[],
  playerMoves: string[]
): boolean {
  const normalizedSolution = solutionUcis.map((m) => m.trim().toLowerCase());
  const normalizedPlayer = playerMoves.map((m) => m.trim().toLowerCase());
  const expectedPlayer = extractPlayerMoves(fen, normalizedSolution);

  if (normalizedPlayer.length !== expectedPlayer.length) return false;
  if (!normalizedPlayer.every((m, i) => m === expectedPlayer[i])) return false;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return false;
  }

  for (const uci of normalizedSolution) {
    if (!applyMoveToChess(chess, uci)) return false;
  }
  return true;
}

/** Whether it is the solver's turn given moves already applied on the line. */
export function isSolverTurn(
  fen: string,
  lineMoves: string[],
  fantasyRules?: FantasyRuleSet
): boolean {
  const turn = sideToMoveAfterLine(fen, lineMoves, fantasyRules);
  if (!turn) return false;
  return turn === getSolverColor(fen);
}
