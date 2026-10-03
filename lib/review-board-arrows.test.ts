import { describe, expect, it } from "vitest";
import { shortenArrowEndpoints } from "@/lib/chess-arrows";
import {
  REVIEW_ARROW_COLORS,
  reviewMainBoardArrows,
  threatArrowsFromFen,
} from "@/lib/review-board-arrows";

const AFTER_E4 =
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const QH5_VS_E5 =
  "rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2";
const QH5_CHECK =
  "rnbqkbnr/ppppp1pp/5p2/7Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2";

describe("shortenArrowEndpoints", () => {
  it("keeps the head short of the destination center", () => {
    const from = { x: 6.25, y: 93.75 };
    const to = { x: 6.25, y: 56.25 };
    const line = shortenArrowEndpoints(from, to);
    expect(line.y1).toBeLessThan(from.y);
    expect(line.y2).toBeGreaterThan(to.y);
  });
});

describe("threatArrowsFromFen", () => {
  it("draws a check arrow to the king", () => {
    const arrows = threatArrowsFromFen(QH5_CHECK);
    expect(arrows.some((a) => a.from === "h5" && a.to === "e8")).toBe(true);
  });

  it("marks the queen attack on the hanging e5 pawn", () => {
    const arrows = threatArrowsFromFen(QH5_VS_E5);
    expect(arrows.some((a) => a.from === "h5" && a.to === "e5")).toBe(true);
  });

  it("shows the scholar-style battery on f7 even when the king 'defends'", () => {
    const fen =
      "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3";
    const arrows = threatArrowsFromFen(fen);
    expect(arrows.some((a) => a.from === "h5" && a.to === "f7")).toBe(true);
    expect(arrows.some((a) => a.from === "c4" && a.to === "f7")).toBe(true);
  });

  it("returns nothing for an invalid FEN", () => {
    expect(threatArrowsFromFen("not-a-fen")).toEqual([]);
  });
});

describe("reviewMainBoardArrows", () => {
  it("draws the last two plies on top of threats", () => {
    const arrows = reviewMainBoardArrows({
      fen: QH5_VS_E5,
      lastMoveUci: "d1h5",
      previousMoveUci: "e7e5",
    });
    const last = arrows.find((a) => a.from === "d1" && a.to === "h5");
    const previous = arrows.find((a) => a.from === "e7" && a.to === "e5");
    expect(last?.color).toBe(REVIEW_ARROW_COLORS.lastMove);
    expect(previous?.color).toBe(REVIEW_ARROW_COLORS.previousMove);
    expect(arrows.indexOf(last!)).toBeGreaterThan(arrows.indexOf(previous!));
  });

  it("keeps the last-move color when it duplicates a threat", () => {
    const arrows = reviewMainBoardArrows({
      fen: AFTER_E4,
      lastMoveUci: "e2e4",
    });
    const last = arrows.filter((a) => a.from === "e2" && a.to === "e4");
    expect(last).toHaveLength(1);
    expect(last[0].color).toBe(REVIEW_ARROW_COLORS.lastMove);
  });
});
