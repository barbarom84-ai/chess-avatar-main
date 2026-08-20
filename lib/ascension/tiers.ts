import type { ChampionTier } from "@/lib/ascension/types";

export const TIER_ORDER: ChampionTier[] = [
  "stone",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "legendary",
];

// ── ELO-based tier resolution (legacy / cosmetic) ────────────────────────────

const ELO_THRESHOLDS: { tier: ChampionTier; minElo: number }[] = [
  { tier: "legendary", minElo: 3000 },
  { tier: "diamond", minElo: 2500 },
  { tier: "platinum", minElo: 2000 },
  { tier: "gold", minElo: 1500 },
  { tier: "silver", minElo: 1000 },
  { tier: "bronze", minElo: 500 },
  { tier: "stone", minElo: 0 },
];

export function resolveChampionTier(elo: number): ChampionTier {
  const clamped = Math.max(0, Math.min(3000, Math.round(elo)));
  for (const entry of ELO_THRESHOLDS) {
    if (clamped >= entry.minElo) return entry.tier;
  }
  return "stone";
}

// ── Puzzle-count-based tier resolution (progression) ─────────────────────────

/** One tier every 20 completed puzzles. Legendary is reached at 120. */
export const TIER_PUZZLE_THRESHOLDS: { tier: ChampionTier; minCount: number }[] = [
  { tier: "legendary", minCount: 120 },
  { tier: "diamond",  minCount: 100 },
  { tier: "platinum", minCount: 80  },
  { tier: "gold",     minCount: 60  },
  { tier: "silver",   minCount: 40  },
  { tier: "bronze",   minCount: 20  },
  { tier: "stone",    minCount: 0   },
];

/** Total puzzles needed to reach each tier (for progress display). */
export const PUZZLES_PER_TIER = 20;

export function resolveChampionTierByCount(completedCount: number): ChampionTier {
  for (const entry of TIER_PUZZLE_THRESHOLDS) {
    if (completedCount >= entry.minCount) return entry.tier;
  }
  return "stone";
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export function nextTierAfter(current: ChampionTier): ChampionTier | null {
  const idx = TIER_ORDER.indexOf(current);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1]!;
}

/** How many more puzzles until the next tier (null = already legendary). */
export function countToNextTier(completedCount: number): number | null {
  const tier = resolveChampionTierByCount(completedCount);
  const next = nextTierAfter(tier);
  if (!next) return null;
  const nextThreshold = TIER_PUZZLE_THRESHOLDS.find((t) => t.tier === next)?.minCount;
  if (nextThreshold == null) return null;
  return Math.max(0, nextThreshold - completedCount);
}

/** @deprecated Use countToNextTier — kept for legacy callers. */
export function eloToNextTier(elo: number): number | null {
  const tier = resolveChampionTier(elo);
  const next = nextTierAfter(tier);
  if (!next) return null;
  const nextThreshold = ELO_THRESHOLDS.find((t) => t.tier === next)?.minElo;
  if (nextThreshold == null) return null;
  return Math.max(0, nextThreshold - elo);
}
