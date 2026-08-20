import { describe, expect, it } from "vitest";
import {
  nextMainlineUciIfAlignedWithGame,
  type ParsedGameForReview,
} from "./game-review";

function minimalParsed(ucis: string[]): ParsedGameForReview {
  return {
    fenBefore: [],
    fenAfter: [],
    san: [],
    uci: ucis,
    sideToMove: [],
    headers: {},
  };
}

describe("nextMainlineUciIfAlignedWithGame", () => {
  it("returns first mainline move from branch with empty prefix", () => {
    const p = minimalParsed(["e2e4", "e7e5"]);
    expect(nextMainlineUciIfAlignedWithGame(p, 0, [])).toBe("e2e4");
    expect(nextMainlineUciIfAlignedWithGame(p, 1, [])).toBe("e7e5");
  });

  it("returns null when prefix diverges from the game", () => {
    const p = minimalParsed(["e2e4", "e7e5"]);
    expect(nextMainlineUciIfAlignedWithGame(p, 0, [{ uci: "d2d4" }])).toBeNull();
  });

  it("returns next move when prefix matches mainline", () => {
    const p = minimalParsed(["e2e4", "e7e5", "g1f3"]);
    expect(
      nextMainlineUciIfAlignedWithGame(p, 0, [{ uci: "e2e4" }])
    ).toBe("e7e5");
  });

  it("returns null when there is no further mainline move", () => {
    const p = minimalParsed(["e2e4"]);
    expect(nextMainlineUciIfAlignedWithGame(p, 0, [])).toBe("e2e4");
    expect(
      nextMainlineUciIfAlignedWithGame(p, 0, [{ uci: "e2e4" }])
    ).toBeNull();
  });

  it("returns null for negative branch ply", () => {
    const p = minimalParsed(["e2e4"]);
    expect(nextMainlineUciIfAlignedWithGame(p, -1, [])).toBeNull();
  });
});
