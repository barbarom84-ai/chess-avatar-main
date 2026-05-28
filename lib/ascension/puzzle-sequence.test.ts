import { describe, expect, it } from "vitest";
import type { FantasyRuleSet } from "@/lib/ascension/fantasy-chess/types";
import {
  extractPlayerMoves,
  isSolverTurn,
} from "@/lib/ascension/puzzle-sequence";

const greedyPuzzleFen = "6nk/6pp/5p1P/4p3/3p4/2p5/1P6/K7 w - - 0 1";
const greedyRules: FantasyRuleSet = {
  enabledAbilities: ["pawn_greedy"],
  objective: "reach_square",
  objectiveSquare: "g7",
};
const greedySolution = ["b2c3", "c3d4", "d4e5", "e5f6", "f6g7"];

describe("isSolverTurn with greedy pawn", () => {
  it("keeps solver turn active during capture chain", () => {
    expect(isSolverTurn(greedyPuzzleFen, [], greedyRules)).toBe(true);
    expect(isSolverTurn(greedyPuzzleFen, ["b2c3"], greedyRules)).toBe(true);
    expect(isSolverTurn(greedyPuzzleFen, ["b2c3", "c3d4"], greedyRules)).toBe(
      true
    );
  });

  it("standard chess incorrectly ends solver turn after first capture", () => {
    expect(isSolverTurn(greedyPuzzleFen, ["b2c3"])).toBe(false);
  });
});

describe("extractPlayerMoves with greedy pawn", () => {
  it("counts every chain capture as a player move", () => {
    expect(extractPlayerMoves(greedyPuzzleFen, greedySolution, greedyRules)).toEqual(
      greedySolution
    );
  });
});
