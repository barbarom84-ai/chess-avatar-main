import { describe, expect, it } from "vitest";
import { fullMoveCount, pvpGameStatsFromUcis } from "@/lib/pvp-result-stats";

describe("fullMoveCount", () => {
  it("counts a white and black reply as one move", () => {
    expect(fullMoveCount(0)).toBe(0);
    expect(fullMoveCount(1)).toBe(1);
    expect(fullMoveCount(2)).toBe(1);
    expect(fullMoveCount(7)).toBe(4);
  });
});

describe("pvpGameStatsFromUcis", () => {
  it("reports scholar's mate as 4 moves with one capture and one check", () => {
    const stats = pvpGameStatsFromUcis(["e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6", "h5f7"]);
    expect(stats).toEqual({ totalMoves: 4, captures: 1, checks: 1 });
  });
});
