import { describe, expect, it } from "vitest";
import { classifyMove } from "./analysis-engine";
import { getAnalysisProfile } from "./analysis-profiles";
import {
  CLASSIFICATION_COLORS,
  buildReviewedMove,
  isOfferedSacrifice,
} from "./game-review";

const standard = getAnalysisProfile("standard");

describe("classification glyphs", () => {
  it("marks brilliant with !! and missed wins with X", () => {
    expect(CLASSIFICATION_COLORS.brilliant.emoji).toBe("!!");
    expect(CLASSIFICATION_COLORS.miss.emoji).toBe("X");
  });
});

describe("isOfferedSacrifice", () => {
  it("does not treat a developing pawn as a sacrifice", () => {
    expect(
      isOfferedSacrifice(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "e2e4"
      )
    ).toBe(false);
  });

  it("detects a knight taking a recapturable pawn (Nxe5)", () => {
    expect(
      isOfferedSacrifice(
        "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        "f3e5"
      )
    ).toBe(true);
  });
});

describe("classifyMove brilliant vs miss", () => {
  it("promotes a sound sacrifice that is still best to brilliant", () => {
    expect(
      classifyMove(0, {
        bestEvalPawns: 1.2,
        playerEvalPawns: 1.2,
        sideToMove: "white",
        evalBeforePawns: 0.3,
        isSacrifice: true,
      }, standard)
    ).toBe("brilliant");
  });

  it("labels a missed mate as miss, not brilliant", () => {
    expect(
      classifyMove(0, {
        bestEvalPawns: 99,
        playerEvalPawns: 0.4,
        sideToMove: "white",
        evalBeforePawns: 2,
        isMateBest: true,
        isMatePlayer: false,
        isSacrifice: true,
      }, standard)
    ).toBe("miss");
  });
});

describe("buildReviewedMove", () => {
  it("keeps book-like zero-CPL moves as best when nothing is offered", () => {
    const m = buildReviewedMove({
      ply: 0,
      san: "e4",
      uci: "e2e4",
      sideToMove: "white",
      evalBefore: 0.2,
      bestMove: "e2e4",
      bestSan: "e4",
      bestEval: 0.3,
      playerEval: 0.3,
      fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    });
    expect(m.classification).toBe("best");
  });
});
