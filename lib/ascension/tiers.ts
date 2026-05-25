import type { ChampionTier } from "@/lib/ascension/types";

const TIER_THRESHOLDS: { tier: ChampionTier; minElo: number }[] = [
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
  for (const entry of TIER_THRESHOLDS) {
    if (clamped >= entry.minElo) return entry.tier;
  }
  return "stone";
}

export function nextTierAfter(current: ChampionTier): ChampionTier | null {
  const order: ChampionTier[] = [
    "stone",
    "bronze",
    "silver",
    "gold",
    "platinum",
    "diamond",
    "legendary",
  ];
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1]!;
}

export function eloToNextTier(elo: number): number | null {
  const tier = resolveChampionTier(elo);
  const next = nextTierAfter(tier);
  if (!next) return null;
  const nextThreshold = TIER_THRESHOLDS.find((t) => t.tier === next)?.minElo;
  if (nextThreshold == null) return null;
  return Math.max(0, nextThreshold - elo);
}

export const TIER_ORDER: ChampionTier[] = [
  "stone",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "legendary",
];
