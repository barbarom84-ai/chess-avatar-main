import { describe, expect, it } from "vitest";
import {
  isPuzzleWithinPlanLimit,
  isTrackUnlocked,
  normalizeTrackSlug,
  type DbCampaignTrack,
} from "@/lib/ascension/campaign-tracks";
import type { DbCampaignPuzzle } from "@/lib/ascension/types";

const mainTrack: DbCampaignTrack = {
  slug: "main",
  label: { fr: "Principale", en: "Main" },
  sort_order: 0,
  layout: "main",
  unlock_rule: { type: "always" },
  is_system: true,
};

const fantasyTrack: DbCampaignTrack = {
  slug: "fantasy",
  label: { fr: "Fantasy", en: "Fantasy" },
  sort_order: 1,
  layout: "sequential",
  unlock_rule: { type: "main_complete_or_elo", min_elo: 3000 },
  is_system: true,
};

describe("isPuzzleWithinPlanLimit", () => {
  it("allows first 3 levels for free users", () => {
    expect(isPuzzleWithinPlanLimit(1, false)).toBe(true);
    expect(isPuzzleWithinPlanLimit(3, false)).toBe(true);
    expect(isPuzzleWithinPlanLimit(4, false)).toBe(false);
  });

  it("allows all levels for premium users", () => {
    expect(isPuzzleWithinPlanLimit(20, true)).toBe(true);
    expect(isPuzzleWithinPlanLimit(99, true)).toBe(true);
  });
});

describe("isTrackUnlocked", () => {
  const puzzles = [
    {
      id: "1",
      track: "main",
      kind: "standard" as const,
      sort_order: 1,
      completed: false,
    },
    {
      id: "2",
      track: "main",
      kind: "standard" as const,
      sort_order: 2,
      completed: false,
    },
  ] as (DbCampaignPuzzle & { completed: boolean })[];

  it("always unlocks main track", () => {
    expect(isTrackUnlocked(mainTrack, 0, puzzles)).toBe(true);
  });

  it("locks fantasy until elo gate or main complete", () => {
    expect(isTrackUnlocked(fantasyTrack, 1000, puzzles)).toBe(false);
    expect(isTrackUnlocked(fantasyTrack, 3000, puzzles)).toBe(true);
  });
});

describe("normalizeTrackSlug", () => {
  it("normalizes slugs", () => {
    expect(normalizeTrackSlug("  Ma Piste! ")).toBe("ma-piste");
  });
});
