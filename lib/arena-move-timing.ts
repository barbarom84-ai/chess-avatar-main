import { Chess } from "chess.js";
import type { EngineConfig } from "@/lib/analysis";
import type { ArenaCadence } from "@/lib/arena-time-controls";
import {
  forcedLinePrefixMatchesBotMovesOnly,
  getEffectiveForcedLinesByColor,
  nextForcedMoveForBot,
} from "@/lib/forced-line-utils";

export type ArenaPhase = "opening" | "middlegame" | "endgame";
export type ArenaTimingContext = "spectator" | "playoff";
export type ArenaThinkMode = "theoretical" | "main" | "zeitnot";

/** Réflexion standard après la sortie du répertoire théorique. */
export const ARENA_MAIN_THINK_MS = 3000;
/** Sous ce seuil à l’horloge, le bot accélère. */
export const ARENA_ZEITNOT_THRESHOLD_MS = 20_000;
/** Réflexion en zeitnot. */
export const ARENA_ZEITNOT_THINK_MS = 900;
/** Réflexion pendant l’ouverture théorique (coup livre). */
export const ARENA_THEORETICAL_THINK_MS = 350;

const OPENING_MAX_PLY = 16;
const ENDGAME_MAX_PIECES = 10;
const LATE_ENDGAME_PLY = 50;
const LATE_ENDGAME_MAX_PIECES = 12;

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

/** Encore dans le répertoire théorique (ligne imposée ou premiers coups sans livre). */
export function isArenaTheoreticalOpening(
  config: EngineConfig,
  ply: number,
  historyUci: string[]
): boolean {
  const { white, black } = getEffectiveForcedLinesByColor(config);
  if (white.length === 0 && black.length === 0) {
    return ply < OPENING_MAX_PLY;
  }
  const botPlaysWhite = ply % 2 === 0;
  if (
    !forcedLinePrefixMatchesBotMovesOnly(
      white,
      black,
      historyUci,
      botPlaysWhite
    )
  ) {
    return false;
  }
  return nextForcedMoveForBot(white, black, ply, botPlaysWhite) !== undefined;
}

/** UCI du coup si un seul coup légal (jouable instantanément). */
export function getSingleLegalMoveUci(game: Chess): string | null {
  try {
    const moves = game.moves({ verbose: true });
    if (moves.length !== 1) return null;
    const m = moves[0];
    return `${m.from}${m.to}${m.promotion ?? ""}`;
  } catch {
    return null;
  }
}

export function getCadenceDepthCap(
  cadence: ArenaCadence,
  depthCap: number
): number {
  const byTime =
    cadence.initialSec <= 120
      ? 9
      : cadence.initialSec <= 300
        ? 11
        : cadence.initialSec <= 600
          ? 13
          : 15;
  const withInc = cadence.incrementSec > 0 ? byTime + 1 : byTime;
  return Math.min(depthCap, withInc);
}

export function getArenaThinkMode(
  inTheoreticalOpening: boolean,
  sideClockMs?: number
): ArenaThinkMode {
  if (inTheoreticalOpening) return "theoretical";
  if (
    sideClockMs != null &&
    sideClockMs < ARENA_ZEITNOT_THRESHOLD_MS
  ) {
    return "zeitnot";
  }
  return "main";
}

export function getArenaThinkBudgetMs(
  inTheoreticalOpening: boolean,
  sideClockMs?: number,
  singleLegalMove = false
): number {
  if (singleLegalMove) return 0;
  const mode = getArenaThinkMode(inTheoreticalOpening, sideClockMs);
  if (mode === "theoretical") return ARENA_THEORETICAL_THINK_MS;
  if (mode === "zeitnot") return ARENA_ZEITNOT_THINK_MS;
  return ARENA_MAIN_THINK_MS;
}

/** Movetime / depth pour Stockfish — le pad complète le budget si le moteur finit tôt. */
export function getArenaMoveParams(
  _base: EngineConfig,
  _phase: ArenaPhase,
  depthCap: number,
  _cadence: ArenaCadence,
  thinkBudgetMs: number,
  thinkMode: ArenaThinkMode
): { timeControl: number; depth: number } {
  const timeControl = thinkBudgetMs;

  const depth =
    thinkMode === "theoretical"
      ? Math.min(8, depthCap)
      : thinkMode === "zeitnot"
        ? Math.min(10, depthCap)
        : Math.min(Math.max(12, depthCap), 18);

  return { timeControl, depth };
}

/** Attend la fin du budget de réflexion (horloge incluse en playoff). */
export async function sleepArenaThinkRemainder(
  startedAtMs: number,
  budgetMs: number
): Promise<void> {
  const remaining = Math.max(0, budgetMs - (Date.now() - startedAtMs));
  if (remaining > 0) {
    await new Promise((r) => setTimeout(r, remaining));
  }
}

/** Pause UI après coup — minimale : le budget principal est appliqué avant le coup. */
export function getArenaMoveDisplayDelayMs(
  _phase: ArenaPhase,
  _movetimeMs: number,
  _context: ArenaTimingContext = "spectator"
): number {
  return 80;
}
