import type { EngineConfig } from "./analysis";
import { pickPersonaBiasedMove, skillLevelFromDifficulty, uciEloFromConfig, multiPvCountForDifficulty } from "./persona-engine-params";

export interface ComparisonMoveResult {
  uci: string;
  source: "opening_book" | "engine";
  profileName: string;
}

/**
 * Resolve an avatar's move for a given FEN using opening book or engine params.
 * Engine move resolution happens client-side via Stockfish; this picks from book first.
 */
export function resolveAvatarBookMove(
  fen: string,
  config: EngineConfig,
  side: "w" | "b"
): string | null {
  const openings = config.openings ?? {};
  const bookKey = Object.keys(openings).find((k) => k === fen || k.startsWith(fen.split(" ")[0]));
  if (!bookKey) return null;
  const move = openings[bookKey];
  if (!move) return null;
  const sideToMove = fen.split(" ")[1];
  if ((side === "w" && sideToMove !== "w") || (side === "b" && sideToMove !== "b")) {
    return null;
  }
  return move;
}

export function engineOptionsForConfig(config: EngineConfig): {
  skill: number;
  uciElo: number;
  multiPv: number;
  depth: number;
} {
  return {
    skill: skillLevelFromDifficulty(config.difficulty),
    uciElo: uciEloFromConfig(config.elo),
    multiPv: multiPvCountForDifficulty(config.difficulty),
    depth: Math.min(20, Math.max(8, config.depth ?? 12)),
  };
}

export function pickMoveFromLines(
  bestMove: string,
  lines: Map<number, string>,
  config: EngineConfig
): string {
  return pickPersonaBiasedMove(bestMove, lines, config);
}
