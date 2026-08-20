import { describe, expect, it, beforeEach } from "vitest";
import {
  clearAggregatedOpeningsCache,
  computeOpeningByPly,
  ensureOpeningsPartitionsLoaded,
  findBestOpeningByPrefix,
  isStrictBookPly,
  setPartitionOpeningsForTests,
} from "./openings-registry";
import type { Opening } from "./openings-library";

const italianLine: Opening = {
  id: "test-italian",
  name: "Italian Test",
  eco: "C50",
  moves: "1. e4 e5 2. Nf3 Nc6 3. Bc4",
  uciMoves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"],
  character: "classical",
  difficulty: 2,
  popularity: 3,
  color: "white",
  description: "test",
  tags: ["test"],
};

describe("computeOpeningByPly", () => {
  beforeEach(() => {
    clearAggregatedOpeningsCache();
    setPartitionOpeningsForTests([italianLine]);
  });

  it("matches incremental plies when still in book", () => {
    const uci = ["e2e4", "e7e5", "g1f3"];
    const byPly = computeOpeningByPly(uci);
    expect(byPly[2]).toEqual(italianLine);
  });

  it("isStrictBookPly rejects wrong move at same prefix depth", () => {
    const uci = ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"];
    const byPly = computeOpeningByPly(uci);
    expect(byPly[4]).toBeNull();
    expect(isStrictBookPly(italianLine, uci, 4)).toBe(false);
  });

  it("returns nulls after leaving book", () => {
    const uci = ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"];
    const byPly = computeOpeningByPly(uci);
    expect(byPly[4]).toBeNull();
    expect(byPly.slice(5).every((o) => o === null)).toBe(true);
  });
});

describe("lichess partition load", () => {
  beforeEach(() => {
    clearAggregatedOpeningsCache();
  });

  it("loads full catalog when ensureOpeningsPartitionsLoaded resolves", async () => {
    await ensureOpeningsPartitionsLoaded();
    const { opening, matchedPlies } = findBestOpeningByPrefix([
      "e2e4",
      "e7e5",
      "g1f3",
      "b8c6",
      "f1c4",
    ]);
    expect(matchedPlies).toBe(5);
    expect(opening).not.toBeNull();
  }, 30_000);
});
