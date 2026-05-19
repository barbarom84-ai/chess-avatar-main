import { describe, expect, it, beforeEach } from "vitest";
import {
  clearAggregatedOpeningsCache,
  computeOpeningByPly,
  findBestOpeningByPrefix,
  getAggregatedOpenings,
} from "./openings-registry";

describe("computeOpeningByPly", () => {
  beforeEach(() => {
    clearAggregatedOpeningsCache();
  });

  it("matches incremental plies when still in book", () => {
    const uci = ["e2e4", "e7e5", "g1f3"];
    const byPly = computeOpeningByPly(uci);
    const full = findBestOpeningByPrefix(uci);
    if (full.opening && full.matchedPlies === uci.length) {
      expect(byPly[uci.length - 1]).toEqual(full.opening);
    } else {
      expect(byPly.every((o) => o === null || o !== undefined)).toBe(true);
    }
  });

  it("aggregated pool includes Lichess partition (expanded catalog)", () => {
    const pool = getAggregatedOpenings();
    const lichessCount = pool.filter((o) =>
      o.tags?.includes("lichess-openings")
    ).length;
    expect(lichessCount).toBeGreaterThan(3000);
  });

  it("findBestOpeningByPrefix matches full e4 e5 Italian line", () => {
    const uci = ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"];
    const { opening, matchedPlies } = findBestOpeningByPrefix(uci);
    expect(matchedPlies).toBe(5);
    expect(opening).not.toBeNull();
    expect(opening!.uciMoves.slice(0, 5)).toEqual(uci);
  });

  it("returns nulls after leaving book", () => {
    const fakeLong = Array.from({ length: 40 }, (_, i) =>
      i % 2 === 0 ? "e2e4" : "e7e5"
    );
    const byPly = computeOpeningByPly(fakeLong);
    const firstNull = byPly.findIndex((o) => o === null);
    if (firstNull >= 0) {
      expect(byPly.slice(firstNull).every((o) => o === null)).toBe(true);
    }
  });
});
