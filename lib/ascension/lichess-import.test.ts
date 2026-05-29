import { describe, expect, it } from "vitest";
import type { NormalizedLichessPuzzle } from "@/lib/lichess-puzzle";
import { validateStandardPuzzleLine } from "@/lib/ascension/puzzle-validation";
import {
  assignTargetLevels,
  buildPromptFromThemes,
  lichessPuzzleSlug,
  lichessPuzzleToCampaignRow,
  nextFreeStandardLevel,
  rewardForRating,
  type CampaignLevelSlot,
} from "@/lib/ascension/lichess-import";

function puzzle(overrides: Partial<NormalizedLichessPuzzle> = {}): NormalizedLichessPuzzle {
  return {
    puzzleId: "abc12",
    gameId: "game1",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    solutionUci: ["h5f7"],
    themes: ["mateIn1", "short"],
    rating: 1500,
    plays: 1000,
    rawPgn: "",
    players: [],
    ...overrides,
  };
}

describe("lichessPuzzleSlug", () => {
  it("is stable and prefixed", () => {
    expect(lichessPuzzleSlug("abc12")).toBe("lichess-abc12");
  });
});

describe("buildPromptFromThemes", () => {
  it("maps a known theme to a bilingual label", () => {
    expect(buildPromptFromThemes(["mateIn2", "fork"])).toEqual({
      fr: "Mat en 2 coups",
      en: "Mate in 2",
    });
  });

  it("falls back to a generic prompt when no theme matches", () => {
    expect(buildPromptFromThemes(["unknownTheme"])).toEqual({
      fr: "Trouvez le meilleur coup",
      en: "Find the best move",
    });
  });
});

describe("rewardForRating", () => {
  it("scales with rating and stays within bounds", () => {
    expect(rewardForRating(1500)).toBe(25);
    expect(rewardForRating(0)).toBe(10);
    expect(rewardForRating(5000)).toBe(40);
    expect(rewardForRating(Number.NaN)).toBe(10);
  });
});

describe("lichessPuzzleToCampaignRow", () => {
  it("produces a publishable standard row", () => {
    const row = lichessPuzzleToCampaignRow(puzzle(), 7);
    expect(row.slug).toBe("lichess-abc12");
    expect(row.kind).toBe("standard");
    expect(row.sort_order).toBe(7);
    expect(row.is_published).toBe(true);
    expect(row.solution_ucis).toEqual(["h5f7"]);
    expect(row.fantasy_rules).toEqual({});
    expect(row.hints).toEqual([]);
    expect(row.xp_reward).toBe(25);
    expect(row.elo_reward).toBe(25);
    expect(row.prompt).toEqual({ fr: "Mat en 1 coup", en: "Mate in 1" });
    expect(row.insight.fr).toContain("lichess.org/training/abc12");
    expect(row.insight.en).toContain("Rating 1500");
  });

  it("normalizes solution UCIs to lowercase", () => {
    const row = lichessPuzzleToCampaignRow(puzzle({ solutionUci: ["H5F7"] }), 1);
    expect(row.solution_ucis).toEqual(["h5f7"]);
  });

  it("stays valid through validateStandardPuzzleLine", () => {
    const row = lichessPuzzleToCampaignRow(puzzle(), 1);
    expect(validateStandardPuzzleLine(row.fen, row.solution_ucis).ok).toBe(true);
  });
});

describe("nextFreeStandardLevel", () => {
  it("returns 1 when nothing is published", () => {
    const existing: CampaignLevelSlot[] = [
      { sort_order: 1, is_published: false },
      { sort_order: 2, is_published: false },
    ];
    expect(nextFreeStandardLevel(existing)).toBe(1);
  });

  it("skips published levels", () => {
    const existing: CampaignLevelSlot[] = [
      { sort_order: 1, is_published: true },
      { sort_order: 2, is_published: true },
      { sort_order: 3, is_published: false },
    ];
    expect(nextFreeStandardLevel(existing)).toBe(3);
  });
});

describe("assignTargetLevels", () => {
  it("fills consecutive free levels from startLevel", () => {
    const existing: CampaignLevelSlot[] = [{ sort_order: 1, is_published: true }];
    const result = assignTargetLevels(existing, ["a", "b", "c"], 2);
    expect(result).toEqual([
      { puzzle: "a", level: 2 },
      { puzzle: "b", level: 3 },
      { puzzle: "c", level: 4 },
    ]);
  });

  it("skips occupied levels between assignments", () => {
    const existing: CampaignLevelSlot[] = [
      { sort_order: 2, is_published: true },
      { sort_order: 4, is_published: true },
    ];
    const result = assignTargetLevels(existing, ["a", "b", "c"], 1);
    expect(result.map((r) => r.level)).toEqual([1, 3, 5]);
  });

  it("clamps startLevel to at least 1", () => {
    const result = assignTargetLevels([], ["a"], -5);
    expect(result[0]!.level).toBe(1);
  });
});

describe("validation guard", () => {
  it("rejects an incoherent FEN/solution pair", () => {
    const incoherent = puzzle({ solutionUci: ["e2e4"] });
    expect(
      validateStandardPuzzleLine(incoherent.fen, incoherent.solutionUci).ok
    ).toBe(false);
  });
});
