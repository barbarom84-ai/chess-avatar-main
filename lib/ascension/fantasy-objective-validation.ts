import { FantasyChessEngine } from "@/lib/ascension/fantasy-chess/engine";
import type {
  FantasyObjective,
  PieceAbilityId,
  SquareEffect,
} from "@/lib/ascension/fantasy-chess/types";
import { getSideToMoveFromFen } from "@/lib/ascension/fen-utils";
import { getSolverColor } from "@/lib/ascension/puzzle-sequence";

export type FantasyRulesInput = {
  enabledAbilities: PieceAbilityId[];
  objective?: FantasyObjective;
  objectiveSquare?: string;
  objectivePiece?: string;
  specialSquares?: SquareEffect[];
  passiveSkills?: string[];
};

/** Exact player-line match against the authored solution (solver plies only). */
export function validateFantasyPlayerSolutionExact(
  fen: string,
  rules: FantasyRulesInput,
  solutionUcis: string[],
  playerMoves: string[]
): boolean {
  const normalizedSolution = solutionUcis.map((m) => m.trim().toLowerCase());
  const normalizedPlayer = playerMoves.map((m) => m.trim().toLowerCase());
  const solverColor = getSolverColor(fen);

  const expectedIndices: number[] = [];
  const engine = new FantasyChessEngine(fen, {
    enabledAbilities: rules.enabledAbilities,
    objective: rules.objective,
    objectiveSquare: rules.objectiveSquare,
    objectivePiece: rules.objectivePiece,
    specialSquares: rules.specialSquares,
    passiveSkills: rules.passiveSkills,
    fantasySide: solverColor,
  });

  for (let i = 0; i < normalizedSolution.length; i++) {
    if (getSideToMoveFromFen(engine.fen) === solverColor) {
      expectedIndices.push(i);
    }
    if (!engine.applyMove(normalizedSolution[i]!)) return false;
  }

  const expectedPlayer = expectedIndices.map((i) => normalizedSolution[i]!);
  if (normalizedPlayer.length !== expectedPlayer.length) return false;
  return normalizedPlayer.every((m, i) => m === expectedPlayer[i]);
}

/**
 * Accepts alternate solver lines that still meet the fantasy objective.
 * Opponent replies are taken in order from the authored solution's opponent plies.
 */
export function validateFantasyByObjective(
  fen: string,
  rules: FantasyRulesInput,
  solutionUcis: string[],
  playerMoves: string[]
): boolean {
  const normalizedSolution = solutionUcis.map((m) => m.trim().toLowerCase());
  const normalizedPlayer = playerMoves.map((m) => m.trim().toLowerCase());
  if (normalizedPlayer.length === 0) return false;

  const solverColor = getSolverColor(fen);
  const engineOpts = {
    enabledAbilities: rules.enabledAbilities,
    objective: rules.objective,
    objectiveSquare: rules.objectiveSquare,
    objectivePiece: rules.objectivePiece,
    specialSquares: rules.specialSquares,
    passiveSkills: rules.passiveSkills,
    fantasySide: solverColor,
  };

  const oppMoves: string[] = [];
  {
    const probe = new FantasyChessEngine(fen, engineOpts);
    for (const m of normalizedSolution) {
      const turn = getSideToMoveFromFen(probe.fen);
      if (turn !== solverColor) oppMoves.push(m);
      if (!probe.applyMove(m)) return false;
    }
  }

  const engine = new FantasyChessEngine(fen, engineOpts);
  let oppIdx = 0;

  for (const pm of normalizedPlayer) {
    while (getSideToMoveFromFen(engine.fen) !== solverColor) {
      if (oppIdx >= oppMoves.length) return false;
      if (!engine.applyMove(oppMoves[oppIdx++]!)) return false;
    }
    if (!engine.applyMove(pm)) return false;
    if (engine.isObjectiveMet(rules.objective ?? "checkmate")) return true;
  }

  return engine.isObjectiveMet(rules.objective ?? "checkmate");
}

export function validateFantasySolution(
  fen: string,
  rules: FantasyRulesInput,
  solutionUcis: string[],
  playerMoves: string[]
): boolean {
  return (
    validateFantasyPlayerSolutionExact(fen, rules, solutionUcis, playerMoves) ||
    validateFantasyByObjective(fen, rules, solutionUcis, playerMoves)
  );
}
