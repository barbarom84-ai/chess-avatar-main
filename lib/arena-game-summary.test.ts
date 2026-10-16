import { describe, expect, it } from "vitest";
import {
  ARENA_SUMMARY_EVAL_CAP,
  classifyMoveLoss,
  evalGraphPoints,
  summarizeArenaGame,
} from "./arena-game-summary";

describe("classifyMoveLoss", () => {
  it("uses 0.5 / 1 / 2 pawn thresholds", () => {
    expect(classifyMoveLoss(0.3)).toBeNull();
    expect(classifyMoveLoss(0.5)).toBe("inaccuracy");
    expect(classifyMoveLoss(1.2)).toBe("mistake");
    expect(classifyMoveLoss(2)).toBe("blunder");
  });
});

describe("summarizeArenaGame", () => {
  it("charges each loss to the side that moved", () => {
    const sans = ["e4", "e5", "Qh5", "Nc6", "Qxf7#"];
    //            w     b     w      b      w
    const evals = [0.3, 0.2, 0.1, 3.5, 10];
    const s = summarizeArenaGame(sans, evals);
    // Black's ...Nc6 dropped from +0.1 to +3.5: a blunder.
    expect(s.sides.b.blunders).toBe(1);
    expect(s.sides.w.blunders).toBe(0);
    expect(s.keyMoments).toEqual([
      expect.objectContaining({ ply: 4, side: "b", san: "Nc6", quality: "blunder", loss: 3.4 }),
    ]);
  });

  it("ignores swings inside an already decided position", () => {
    const s = summarizeArenaGame(["a", "b", "c"], [8, 15, 7]);
    expect(s.sides.w.blunders + s.sides.b.blunders).toBe(0);
  });

  it("skips plies without an evaluation", () => {
    const s = summarizeArenaGame(["a", "b", "c", "d"], [0.2, null, -3, -3]);
    expect(s.sides.b.blunders).toBe(0);
    expect(s.sides.w.blunders).toBe(0);
    expect(s.sides.b.averageLoss).toBe(0);
  });

  it("keeps the worst moments, in game order", () => {
    const sans = Array.from({ length: 8 }, (_, i) => `m${i}`);
    const evals = [0, 2, -1, 3, -2, 4, -3, 5];
    const s = summarizeArenaGame(sans, evals, 3);
    expect(s.keyMoments.map((m) => m.ply)).toEqual([6, 7, 8]);
  });
});

describe("evalGraphPoints", () => {
  it("maps evals to the SVG box and carries the last value over gaps", () => {
    const pts = evalGraphPoints([ARENA_SUMMARY_EVAL_CAP, null, -100], 100, 40);
    expect(pts).toEqual([
      { x: 0, y: 0, ply: 1 },
      { x: 50, y: 0, ply: 2 },
      { x: 100, y: 40, ply: 3 },
    ]);
  });
});
