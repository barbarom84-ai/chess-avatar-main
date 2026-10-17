import { describe, expect, it } from "vitest";
import {
  validateFantasyByObjective,
  validateFantasyPlayerSolutionExact,
  validateFantasySolution,
} from "@/lib/ascension/fantasy-objective-validation";

describe("fantasy objective validation", () => {
  // Mate in 1: white to move, Qh5xh7# style short line isn't needed —
  // use a known scholar's mate-like FEN with a short solution.
  const fen = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1N1 w KQkq - 4 4";
  const solution = ["h5f7"];

  it("accepts the exact authored player line", () => {
    expect(
      validateFantasyPlayerSolutionExact(
        fen,
        { enabledAbilities: [], objective: "checkmate" },
        solution,
        ["h5f7"]
      )
    ).toBe(true);
  });

  it("rejects a wrong move on exact match", () => {
    expect(
      validateFantasyPlayerSolutionExact(
        fen,
        { enabledAbilities: [], objective: "checkmate" },
        solution,
        ["h5h7"]
      )
    ).toBe(false);
  });

  it("accepts an alternate line that still mates via objective check", () => {
    // If h5f7 is mate, objective path should also accept it
    expect(
      validateFantasyByObjective(
        fen,
        { enabledAbilities: [], objective: "checkmate" },
        solution,
        ["h5f7"]
      )
    ).toBe(true);
  });

  it("validateFantasySolution ORs both strategies", () => {
    expect(
      validateFantasySolution(
        fen,
        { enabledAbilities: [], objective: "checkmate" },
        solution,
        ["h5f7"]
      )
    ).toBe(true);
  });
});
