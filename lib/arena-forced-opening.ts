import { Chess } from "chess.js";
import type { EngineConfig } from "@/lib/analysis";
import { applyArenaMoveConfig } from "@/lib/arena-chess";
import { splitUciSequence } from "@/lib/forced-line-utils";
import { getOpeningById } from "@/lib/openings-registry";

export type ArenaForcedLines = { white: string[]; black: string[] };

export function arenaForcedLinesFromOpeningId(
  openingId: string | null | undefined
): ArenaForcedLines | null {
  const id = openingId?.trim();
  if (!id) return null;

  const opening = getOpeningById(id);
  if (!opening?.uciMoves?.length) return null;

  const { white, black } = splitUciSequence(opening.uciMoves);
  if (white.length === 0 && black.length === 0) return null;

  return { white, black };
}

/** Ligne arène imposée : priorité sur le répertoire du profil tant que la séquence est active. */
export function mergeArenaOpeningIntoConfig(
  config: EngineConfig,
  arenaLines: ArenaForcedLines | null
): EngineConfig {
  if (!arenaLines) return config;

  return {
    ...config,
    forcedLineSource: "custom",
    forcedLineWhite: arenaLines.white,
    forcedLineBlack: arenaLines.black,
    forcedLine: undefined,
  };
}

export function prepareArenaEngineConfig(
  base: EngineConfig,
  opts: {
    depthCap: number;
    ply: number;
    game: Chess;
    forcedOpeningId?: string | null;
  }
): EngineConfig {
  const merged = mergeArenaOpeningIntoConfig(
    base,
    arenaForcedLinesFromOpeningId(opts.forcedOpeningId)
  );
  return applyArenaMoveConfig(merged, {
    depthCap: opts.depthCap,
    ply: opts.ply,
    game: opts.game,
  });
}

export const ARENA_FORCED_OPENING_STORAGE = "chess-arena.forcedOpeningId";
