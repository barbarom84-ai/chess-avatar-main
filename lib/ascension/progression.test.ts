import { describe, expect, it } from "vitest";
import { resolveChampionTier, eloToNextTier } from "@/lib/ascension/tiers";
import { computePuzzleRewards, ELO_CAP } from "@/lib/ascension/progression";

describe("resolveChampionTier", () => {
  it("maps elo thresholds to tiers", () => {
    expect(resolveChampionTier(0)).toBe("stone");
    expect(resolveChampionTier(500)).toBe("bronze");
    expect(resolveChampionTier(1000)).toBe("silver");
    expect(resolveChampionTier(3000)).toBe("legendary");
  });

  it("returns remaining elo to next tier", () => {
    expect(eloToNextTier(0)).toBe(500);
    expect(eloToNextTier(3000)).toBeNull();
  });
});

describe("computePuzzleRewards", () => {
  it("caps elo at 3000", () => {
    const result = computePuzzleRewards(2990, 100, {
      kind: "standard",
      xpReward: 50,
      eloReward: 25,
      isFirstCompletion: true,
      completedPuzzleCount: 1,
    });
    expect(result.newElo).toBe(ELO_CAP);
    expect(result.eloGain).toBe(10);
  });

  it("reduces xp on repeat completion", () => {
    const first = computePuzzleRewards(0, 0, {
      kind: "standard",
      xpReward: 100,
      eloReward: 20,
      isFirstCompletion: true,
      completedPuzzleCount: 1,
    });
    const repeat = computePuzzleRewards(20, first.newXp, {
      kind: "standard",
      xpReward: 100,
      eloReward: 20,
      isFirstCompletion: false,
      completedPuzzleCount: 1,
    });
    expect(repeat.xpGain).toBe(10);
    expect(repeat.eloGain).toBe(0);
  });
});
