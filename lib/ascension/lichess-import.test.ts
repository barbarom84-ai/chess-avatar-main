import { describe, expect, it } from "vitest";
import type { NormalizedLichessPuzzle } from "@/lib/lichess-puzzle";
import { validateStandardPuzzleLine } from "@/lib/ascension/puzzle-validation";
import {
  assignTargetLevels,
  buildPromptFromThemes,
  lichessPuzzleSlug,
  lichessPuzzleToCampaignRow,
  nextFreeStandardLevel,
  resolveBatchFen,
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

describe("resolveBatchFen", () => {
  // Real `batch/mix` entry: omits puzzle.fen, and the correct position is at
  // initialPly + 1 (the solution `g3h2` is only legal after all PGN plies).
  const pgn =
    "e4 c5 Nf3 d6 d4 cxd4 Qxd4 Nc6 Bb5 e5 Bxc6+ bxc6 Qc4 Qc7 Nc3 Nf6 Bg5 Be7 Bxf6 Bxf6 Nd5 Qa5+ b4 cxd5 Qc6+ Bd7 Qxa8+ Ke7 Qxh8 Qxb4+ Nd2 Bg5 O-O Qxd2 Qxg7 dxe4 Qxh7 e3 fxe3 Bxe3+ Kh1 Be6 Qh4+ Kd7 Qa4+ Ke7 Rad1 Qe2 Rfe1 Qf2 Qe4 Bf4 Qb7+ Kf6 Qe4 Bf5 Qe2 Qh4 h3 Qg3 Rxd6+ Kg5 Kg1 Bxh3 Rd3";
  const solution = ["g3h2", "g1f1", "h2h1", "f1f2", "h1g2"];

  it("recovers a FEN whose full solution line is legal despite the off-by-one ply", () => {
    const fen = resolveBatchFen(pgn, 64, solution);
    expect(fen).not.toBeNull();
    expect(validateStandardPuzzleLine(fen!, solution).ok).toBe(true);
    // Solver is the side to move; the solution starts with a Black move here.
    expect(fen!.split(" ")[1]).toBe("b");
  });

  it("returns null when no nearby ply yields a legal line", () => {
    expect(resolveBatchFen(pgn, 64, ["a1a8"])).toBeNull();
    expect(resolveBatchFen("", 10, solution)).toBeNull();
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
