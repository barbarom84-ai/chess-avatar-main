import { describe, expect, it } from "vitest";
import {
  formatEvalLabel,
  parseEngineScoreLine,
  stmMateToWhitePov,
  toWhitePovEval,
} from "@/lib/engine-eval";
import { stmEvalToWhitePov } from "@/lib/arena-spectator-helpers";

const WHITE_TO_MOVE =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const BLACK_TO_MOVE =
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

describe("engine-eval", () => {
  it("parses centipawn and mate UCI lines", () => {
    expect(parseEngineScoreLine("info depth 12 score cp 34 pv e2e4")).toEqual({
      evalPawnsStm: 0.34,
      isMate: false,
    });
    expect(parseEngineScoreLine("info depth 12 score mate 3 pv e2e4")).toEqual({
      evalPawnsStm: 10,
      isMate: true,
      mateInMovesStm: 3,
    });
    expect(parseEngineScoreLine("info depth 12 score mate -2 pv e7e5")).toEqual({
      evalPawnsStm: -10,
      isMate: true,
      mateInMovesStm: -2,
    });
  });

  it("keeps White-winning mate as +10 after Black to move", () => {
    const stm = parseEngineScoreLine("info score mate -2")!;
    const white = toWhitePovEval(BLACK_TO_MOVE, stm);
    expect(white.evalWhitePov).toBe(10);
    expect(white.isMate).toBe(true);
    expect(white.mateInMovesWhite).toBe(2);
    expect(formatEvalLabel(white.evalWhitePov, white.isMate, white.mateInMovesWhite)).toBe(
      "M2"
    );
  });

  it("does not flip the sign when it is White to move", () => {
    const stm = parseEngineScoreLine("info score mate 4")!;
    const white = toWhitePovEval(WHITE_TO_MOVE, stm);
    expect(white.evalWhitePov).toBe(10);
    expect(white.mateInMovesWhite).toBe(4);
    expect(stmEvalToWhitePov(WHITE_TO_MOVE, 1.2)).toBe(1.2);
    expect(stmEvalToWhitePov(BLACK_TO_MOVE, 1.2)).toBe(-1.2);
    expect(stmMateToWhitePov(BLACK_TO_MOVE, -3)).toBe(3);
  });

  it("formats pawns with a sign", () => {
    expect(formatEvalLabel(1.234)).toBe("+1.23");
    expect(formatEvalLabel(-0.5)).toBe("-0.50");
    expect(formatEvalLabel(-10, true, -5)).toBe("-M5");
  });
});
