import type { EngineConfig } from "@/lib/analysis";
import { DEFAULT_HUMAN_BLUNDER_INTERVAL } from "@/lib/bot-move-count";

/** Aligné sur Android `EloBounds.kt`. */
export const UCI_ELO_MIN = 1320;
export const UCI_ELO_MAX = 3190;
export const MAX_PROFILE_ELO = 3500;
export const MIN_PROFILE_ELO = 400;

/** Kotlin `Double.toInt()` (truncates toward zero) + clamp 400–3500. */
export function clampProfileElo(elo: number): number {
  const n = elo < 0 ? Math.ceil(elo) : Math.floor(elo);
  return Math.min(MAX_PROFILE_ELO, Math.max(MIN_PROFILE_ELO, n));
}

export type Rng = () => number;

export type EngineOptions = {
  skill: number;
  uciElo: number;
  multiPv: number;
  depth: number;
  movetimeMs: number;
};

/** Skill 0–20 : courbe plus basse pour les niveaux 1–3. */
export function skillLevelFromDifficulty(d: number): number {
  const clamped = Math.min(5, Math.max(1, Math.round(d)));
  const map: Record<number, number> = { 1: 2, 2: 5, 3: 9, 4: 15, 5: 20 };
  return map[clamped] ?? 10;
}

export function uciEloFromProfileElo(elo: number): number {
  return Math.min(UCI_ELO_MAX, Math.max(UCI_ELO_MIN, Math.round(elo)));
}

/** Elo UCI Stockfish (1320–3190) à partir du profil. */
export function uciEloFromConfig(elo: number): number {
  return uciEloFromProfileElo(elo);
}

/**
 * Hash 32-bit Java/Kotlin `String.hashCode` — le jitter arène Android en dépend.
 */
export function javaStringHashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Remainder with dividend sign (Kotlin `rem` / Java `%`). */
function rem(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

/**
 * Arena needs discrimination between 3000–3500 profiles (all clamp to 3190 otherwise)
 * plus a stable style offset so two maxed bots are not identical Stockfish clones.
 * Port of Android `arenaUciEloFromConfig`.
 */
export function arenaUciEloFromConfig(config: EngineConfig): number {
  const elo = config.elo;
  const compressed =
    elo <= 2800
      ? Math.min(2800, Math.max(UCI_ELO_MIN, elo))
      : 2800 + (Math.min(700, Math.max(0, elo - 2800)) * 390) / 700;
  const style = ((Math.min(100, Math.max(0, config.aggressiveness)) - 50) * 12) / 10;
  const diffPenalty = (5 - Math.min(5, Math.max(1, config.difficulty))) * 35;
  const jitter = rem(javaStringHashCode(config.name), 101) - 50;
  const raw = Math.round(compressed + style - diffPenalty + jitter);
  return Math.min(UCI_ELO_MAX, Math.max(UCI_ELO_MIN, raw));
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

/** Arena: keep MultiPV even for strong bots so aggressiveness can diverge lines. */
export function multiPvCountForArena(config: EngineConfig): number {
  const base = multiPvCountForDifficulty(config.difficulty);
  const agg = Math.min(100, Math.max(0, config.aggressiveness));
  if (agg >= 75) return Math.max(base, 3);
  if (agg >= 55) return Math.max(base, 2);
  return Math.max(base, 2);
}

export function engineOptionsForConfig(config: EngineConfig): EngineOptions {
  return {
    skill: skillLevelFromDifficulty(config.difficulty),
    uciElo: uciEloFromConfig(config.elo),
    multiPv: multiPvCountForDifficulty(config.difficulty),
    depth: Math.min(20, Math.max(4, config.depth)),
    movetimeMs: Math.min(5000, Math.max(100, config.timeControl)),
  };
}

export function engineOptionsForArena(config: EngineConfig): EngineOptions {
  return {
    skill: Math.min(18, skillLevelFromDifficulty(config.difficulty)),
    uciElo: arenaUciEloFromConfig(config),
    multiPv: multiPvCountForArena(config),
    depth: Math.min(16, Math.max(10, config.depth)),
    movetimeMs: Math.min(2500, Math.max(600, config.timeControl)),
  };
}

/**
 * Arena bot-vs-bot: strip noisy persona opening books, keep Elo / difficulty /
 * aggressiveness / human-blunder for persona feel.
 */
export function prepareArenaEngineConfig(config: EngineConfig): EngineConfig {
  return {
    ...config,
    forcedLine: undefined,
    forcedLineWhite: undefined,
    forcedLineBlack: undefined,
    forcedLineSource: undefined,
    openings: {},
    humanBlunderInterval:
      config.humanBlunderInterval ?? DEFAULT_HUMAN_BLUNDER_INTERVAL,
    depth: Math.min(16, Math.max(10, config.depth)),
    timeControl: Math.min(2500, Math.max(600, config.timeControl)),
  };
}

/**
 * Choisit un coup parmi les lignes MultiPV. La difficulté et l'agressivité du
 * profil augmentent la chance de sortir de la première ligne (clone plus
 * « humain » / risqué). `arenaStyle` : même variance que l’app Android.
 */
export function pickPersonaBiasedMove(
  bestFromEngine: string,
  lineMoves: Map<number, string>,
  config: EngineConfig,
  rng: Rng = Math.random,
  arenaStyle = false
): string {
  const n = lineMoves.size;
  if (n < 2 || !bestFromEngine) return bestFromEngine;

  const difficulty = config.difficulty;
  const agg =
    Math.min(100, Math.max(0, Number(config.aggressiveness) || 0)) / 100;
  const bump = agg * 0.2 + (arenaStyle ? 0.08 : 0);
  const r = rng();
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
  } else if (arenaStyle || difficulty >= 4) {
    if (r < 0.06 + bump * 0.9) pickRank = 3;
    else if (r < 0.16 + bump) pickRank = 2;
  }

  if (pickRank === 1) return bestFromEngine;

  for (let rank = pickRank; rank >= 2; rank--) {
    const alt = lineMoves.get(rank);
    if (alt && alt !== bestFromEngine) return alt;
  }
  return bestFromEngine;
}
