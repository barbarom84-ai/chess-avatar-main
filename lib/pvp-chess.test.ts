import { describe, expect, it } from "vitest";
import {
  replayGameFromUcis,
  uciToLastMoveSquares,
  validateUciForPlayer,
} from "@/lib/pvp-chess";

describe("validateUciForPlayer", () => {
  it("accepts a legal opening move for white", () => {
    const r = validateUciForPlayer([], "e2e4", "white");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.uci).toBe("e2e4");
  });

  it("rejects when black tries on white turn", () => {
    const r = validateUciForPlayer([], "e2e4", "black");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("Not your turn");
  });

  it("rejects illegal move", () => {
    const r = validateUciForPlayer([], "e2e5", "white");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("Illegal move");
  });

  it("updates position after valid sequence", () => {
    const after = validateUciForPlayer(["e2e4"], "e7e5", "black");
    expect(after.ok).toBe(true);
    const game = replayGameFromUcis(["e2e4", "e7e5"]);
    expect(game.turn()).toBe("w");
  });
});

describe("uciToLastMoveSquares", () => {
  it("parses from/to squares", () => {
    expect(uciToLastMoveSquares("e2e4")).toEqual({ from: "e2", to: "e4" });
  });

  it("returns null for short uci", () => {
    expect(uciToLastMoveSquares("e2")).toBeNull();
  });
});
