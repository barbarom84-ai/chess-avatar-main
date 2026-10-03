import { describe, expect, it } from "vitest";
import { coachBoardSight } from "@/lib/coach-board-sight";

const AFTER_E4 =
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

describe("coachBoardSight", () => {
  it("draws arrows for legal moves cited in the coach text", () => {
    const sight = coachBoardSight({
      fen: AFTER_E4,
      lastMoveUci: "e2e4",
      lastMoveSan: "e4",
      text: "You can answer with e5 or play Nf6.",
    });
    expect(sight?.citedLegal.map((m) => m.san).sort()).toEqual(["Nf6", "e5"]);
    expect(sight?.arrows).toHaveLength(2);
    expect(sight?.citedIllegal).toEqual([]);
  });

  it("flags invented piece moves that are not legal now", () => {
    const sight = coachBoardSight({
      fen: AFTER_E4,
      lastMoveUci: "e2e4",
      lastMoveSan: "e4",
      text: "Best is Nc5, then Bxh7.",
    });
    expect(sight?.citedLegal).toEqual([]);
    expect(sight?.citedIllegal).toEqual(expect.arrayContaining(["Nc5", "Bxh7"]));
  });

  it("does not treat the already-played move as an illegal suggestion", () => {
    const sight = coachBoardSight({
      fen: AFTER_E4,
      lastMoveUci: "e2e4",
      lastMoveSan: "e4",
      bestMoveSan: "d4",
      text: "White already played e4. The missed alternative was d4.",
    });
    expect(sight?.citedIllegal).toEqual([]);
    expect(sight?.lastMove).toEqual({ from: "e2", to: "e4" });
  });

  it("flags a pawn push the coach tells you to play when it is illegal", () => {
    const sight = coachBoardSight({
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      text: "The best continuation for you to play is f5 as well.",
    });
    expect(sight?.citedIllegal).toContain("f5");
  });
});
