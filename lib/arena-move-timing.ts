import { Chess } from "chess.js";
import type { EngineConfig } from "@/lib/analysis";

export type ArenaPhase = "opening" | "middlegame" | "endgame";

const OPENING_MAX_PLY = 16;
const ENDGAME_MAX_PIECES = 10;
const LATE_ENDGAME_PLY = 50;
const LATE_ENDGAME_MAX_PIECES = 12;

const PHASE_MOVETIME: Record<ArenaPhase, { min: number; max: number }> = {
  opening: { min: 280, max: 350 },
  middlegame: { min: 900, max: 1400 },
  endgame: { min: 1400, max: 2000 },
};

const PHASE_MIN_DISPLAY_MS: Record<ArenaPhase, number> = {
  opening: 320,
  middlegame: 380,
  endgame: 450,
};

export function countBoardPieces(game: Chess): number {
  const board = game.board();
  let n = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell) n++;
    }
  }
  return n;
}

export function getArenaPhase(ply: number, game: Chess): ArenaPhase {
  const pieces = countBoardPieces(game);
  if (ply < OPENING_MAX_PLY) return "opening";
  if (
    pieces <= ENDGAME_MAX_PIECES ||
    (ply >= LATE_ENDGAME_PLY && pieces <= LATE_ENDGAME_MAX_PIECES)
  ) {
    return "endgame";
  }
  return "middlegame";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Movetime / depth selon la phase (ouverture rapide, milieu et fin plus lents). */
export function getArenaMoveParams(
  base: EngineConfig,
  phase: ArenaPhase,
  depthCap: number
): { timeControl: number; depth: number } {
  const { min, max } = PHASE_MOVETIME[phase];
  const baseTc = base.timeControl ?? 500;
  let timeControl: number;

  if (phase === "opening") {
    const scale = clamp(baseTc / 1000, 0.85, 1.15);
    timeControl = Math.round(((min + max) / 2) * scale);
  } else if (phase === "middlegame") {
    timeControl = Math.round((min + max) / 2);
  } else {
    timeControl = max;
  }

  timeControl = clamp(timeControl, 100, 2000);

  const depth =
    phase === "opening"
      ? Math.min(depthCap, 8)
      : Math.min(Math.max(5, base.depth), depthCap);

  return { timeControl, depth };
}

export function getArenaMoveDisplayDelayMs(
  phase: ArenaPhase,
  timeControl: number
): number {
  return Math.max(PHASE_MIN_DISPLAY_MS[phase], Math.round(timeControl * 0.25));
}
