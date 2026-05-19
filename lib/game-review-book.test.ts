import { describe, expect, it, vi } from "vitest";
import {
  analyzeParsedGameForReview,
  buildBookTheoryReviewedMove,
  buildParsedGameFromSanHistory,
} from "./game-review";
import { clearAggregatedOpeningsCache, computeOpeningByPly } from "./openings-registry";

describe("buildBookTheoryReviewedMove", () => {
  it("marks book plies with zero CPL and isBook", () => {
    const m = buildBookTheoryReviewedMove({
      ply: 0,
      san: "e4",
      uci: "e2e4",
      sideToMove: "white",
      evalWhitePawns: 0,
    });
    expect(m.isBook).toBe(true);
    expect(m.cpl).toBe(0);
    expect(m.classification).toBe("best");
    expect(m.bestMove).toBe("e2e4");
  });
});

describe("analyzeParsedGameForReview book skip", () => {
  it("does not call the engine for plies still in local theory", async () => {
    clearAggregatedOpeningsCache();
    const parsed = buildParsedGameFromSanHistory(["e4", "e5", "Nf3"]);
    if (!parsed) {
      expect.fail("expected legal mainline");
    }

    const openingByPly = computeOpeningByPly(parsed.uci);
    const bookPlies = openingByPly
      .map((o, i) => (o ? i : -1))
      .filter((i) => i >= 0);
    if (bookPlies.length === 0) {
      return;
    }

    const engine = vi.fn(async (fen: string) => ({
      move: "a1a1",
      evalPawns: 0.5,
    }));

    await analyzeParsedGameForReview({
      parsed,
      getBestMoveAndEval: engine,
      depth: 12,
    });

    for (const ply of bookPlies) {
      expect(engine).not.toHaveBeenCalledWith(parsed.fenBefore[ply], expect.anything());
      expect(engine).not.toHaveBeenCalledWith(parsed.fenAfter[ply], expect.anything());
    }
  });

  it("returns isBook on reviewed moves in theory", async () => {
    clearAggregatedOpeningsCache();
    const parsed = buildParsedGameFromSanHistory(["e4", "e5"]);
    if (!parsed) return;

    const openingByPly = computeOpeningByPly(parsed.uci);
    if (!openingByPly.some(Boolean)) return;

    const result = await analyzeParsedGameForReview({
      parsed,
      getBestMoveAndEval: async () => ({
        move: "g1f3",
        evalPawns: 0.3,
      }),
      depth: 12,
    });

    expect(result.moves.some((m) => m.isBook)).toBe(true);
    expect(result.moves.filter((m) => m.isBook).every((m) => m.cpl === 0)).toBe(
      true
    );
  });
});
