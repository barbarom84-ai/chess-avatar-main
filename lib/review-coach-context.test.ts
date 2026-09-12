import { describe, expect, it } from "vitest";
import {
  buildReviewChatContext,
  inferReviewPlayerColor,
  isExplainableReviewedMove,
  isReviewWhyQuestion,
  pieceInventoryFromFen,
  reviewContextCanExplain,
  turnFromFen,
} from "@/lib/review-coach-context";
import type { ReviewedMove } from "@/lib/game-review";

function move(partial: Partial<ReviewedMove> = {}): ReviewedMove {
  return {
    ply: 4,
    san: "c3",
    uci: "c2c3",
    sideToMove: "white",
    evalBefore: 0.24,
    bestMove: "e1g1",
    bestSan: "O-O",
    bestEval: 0.24,
    playerEval: -2.71,
    cpl: 295,
    classification: "blunder",
    ...partial,
  };
}

describe("review-coach-context", () => {
  it("infers Black from a matching player name in PGN headers", () => {
    const pgn = `[White "Bot"]\n[Black "Marco"]\n\n1. e4 e5 *`;
    expect(
      inferReviewPlayerColor({ pgn, hint: "Marco", playerColor: null })
    ).toBe("black");
  });

  it("keeps an explicit saved color when names do not match", () => {
    const pgn = `[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 *`;
    expect(
      inferReviewPlayerColor({
        pgn,
        hint: null,
        playerColor: "black",
      })
    ).toBe("black");
  });

  it("marks the displayed move as the opponent's when the student is Black", () => {
    const ctx = buildReviewChatContext({
      fen: "after",
      fenBefore: "before",
      move: move({ sideToMove: "white" }),
      playerColor: "black",
    });
    expect(ctx?.isPlayerMove).toBe(false);
    expect(ctx?.playerColor).toBe("black");
    expect(ctx?.sideToMove).toBe("white");
    expect(ctx?.turnToMove).toBe("black");
  });

  it("reads whose turn it is from the displayed FEN, not from who just moved", () => {
    const afterC3 =
      "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R b KQkq - 0 6";
    expect(turnFromFen(afterC3)).toBe("black");
    const ctx = buildReviewChatContext({
      fen: afterC3,
      fenBefore: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6",
      move: move({ sideToMove: "white" }),
      playerColor: "black",
    });
    expect(ctx?.sideToMove).toBe("white");
    expect(ctx?.turnToMove).toBe("black");
    expect(ctx?.boardPieces).toContain("Pc3");
    expect(ctx?.boardPieces).toContain("Nf3");
    expect(ctx?.boardPieces).toContain("Nc6");
    expect(ctx?.boardPieces).not.toContain("Nc5");
  });

  it("lists only pieces that appear on the FEN", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(pieceInventoryFromFen(start)).toBe(
      "White: Ke1 Qd1 Ra1 Rh1 Bc1 Bf1 Nb1 Ng1 Pa2 Pb2 Pc2 Pd2 Pe2 Pf2 Pg2 Ph2; Black: Ke8 Qd8 Ra8 Rh8 Bc8 Bf8 Nb8 Ng8 Pa7 Pb7 Pc7 Pd7 Pe7 Pf7 Pg7 Ph7"
    );
    expect(turnFromFen(start)).toBe("white");
    expect(turnFromFen("not-a-fen")).toBeUndefined();
  });

  it("does not offer an explanation on best/excellent/brilliant moves", () => {
    expect(isExplainableReviewedMove(move({ classification: "best", uci: "e1g1", bestMove: "e1g1" }))).toBe(
      false
    );
    expect(isExplainableReviewedMove(move())).toBe(true);
  });

  it("detects why-this-move questions", () => {
    expect(isReviewWhyQuestion("Pourquoi ce coup ?", "fr")).toBe(true);
    expect(isReviewWhyQuestion("Why this move?", "en")).toBe(true);
    expect(isReviewWhyQuestion("Comment jouer cette position ?", "fr")).toBe(false);
  });

  it("requires engine fields before explain API can run", () => {
    expect(reviewContextCanExplain({ fen: "x" })).toBe(false);
    expect(
      reviewContextCanExplain({
        fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        lastMoveUci: "c2c3",
        bestMoveUci: "e1g1",
        classification: "blunder",
        sideToMove: "white",
        cpl: 295,
      })
    ).toBe(true);
  });
});
