import { describe, expect, it } from "vitest";
import {
  buildReviewChatContext,
  inferReviewPlayerColor,
  isExplainableReviewedMove,
  isReviewWhyQuestion,
  reviewContextCanExplain,
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
