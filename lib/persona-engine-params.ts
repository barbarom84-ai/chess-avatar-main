import type { EngineConfig } from "@/lib/analysis";

/** Skill 0–20 : courbe plus basse pour les niveaux 1–3. */
export function skillLevelFromDifficulty(d: number): number {
  const clamped = Math.min(5, Math.max(1, Math.round(d)));
  const map: Record<number, number> = { 1: 2, 2: 5, 3: 9, 4: 15, 5: 20 };
  return map[clamped] ?? 10;
}

import { uciEloFromProfileElo } from "@/lib/elo-bounds";

/** Elo UCI Stockfish (1320–3190) à partir du profil affiché. */
export function uciEloFromConfig(elo: number): number {
  return uciEloFromProfileElo(elo);
}

/**
 * MultiPV pour tirer parfois un coup sous-optimal (2e, 3e ligne…).
 * 0 = désactivé (niveaux élevés).
 */
export function multiPvCountForDifficulty(d: number): number {
  if (d <= 1) return 4;
  if (d === 2) return 3;
  if (d === 3) return 2;
  return 1;
}

/**
 * Choisit un coup parmi les lignes MultiPV. La difficulté et l'agressivité du
 * profil augmentent la chance de sortir de la première ligne (clone plus
 * « humain » / risqué).
 */
export function pickPersonaBiasedMove(
  bestFromEngine: string,
  lineMoves: Map<number, string>,
  config: EngineConfig
): string {
  const n = lineMoves.size;
  if (n < 2 || !bestFromEngine) return bestFromEngine;

  const difficulty = config.difficulty;
  const agg =
    Math.min(100, Math.max(0, Number(config.aggressiveness) || 0)) / 100;
  /** Jusqu'à +0.20 sur les seuils les plus bas — pousse vers les lignes alternatives */
  const bump = agg * 0.2;
  const r = Math.random();
  let pickRank = 1;

  if (difficulty <= 1) {
    if (r < 0.12 + bump) pickRank = 4;
    else if (r < 0.28 + bump * 0.7) pickRank = 3;
    else if (r < 0.48 + bump * 0.5) pickRank = 2;
  } else if (difficulty === 2) {
    if (r < 0.1 + bump) pickRank = 3;
    else if (r < 0.3 + bump * 0.6) pickRank = 2;
  } else if (difficulty === 3) {
    if (r < 0.14 + bump * 0.8) pickRank = 2;
  }

  if (pickRank === 1) return bestFromEngine;

  for (let rank = pickRank; rank >= 2; rank--) {
    const alt = lineMoves.get(rank);
    if (alt && alt !== bestFromEngine) return alt;
  }
  return bestFromEngine;
}
