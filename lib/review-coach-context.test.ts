import { describe, expect, it } from "vitest";
import {
  buildReviewChatContext,
  classifyReviewCoachQuestion,
  expandReviewCoachUserMessage,
  hydrateReviewChatContext,
  inferPlayedMoveFromFens,
  inferReviewPlayerColor,
  isExplainableReviewedMove,
  isReviewWhyQuestion,
  legalMovesFromFen,
  pieceInventoryFromFen,
  reviewContextCanExplain,
  sanitizeEngineLinesNow,
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
    expect(ctx?.legalMovesNow?.length).toBeGreaterThan(10);
    expect(ctx?.legalMovesNow).toEqual(expect.arrayContaining(["O-O", "d6"]));
    expect(ctx?.boardAscii).toContain("r");
  });

  it("lists only pieces that appear on the FEN", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(pieceInventoryFromFen(start)).toBe(
      "White: Ke1 Qd1 Ra1 Rh1 Bc1 Bf1 Nb1 Ng1 Pa2 Pb2 Pc2 Pd2 Pe2 Pf2 Pg2 Ph2; Black: Ke8 Qd8 Ra8 Rh8 Bc8 Bf8 Nb8 Ng8 Pa7 Pb7 Pc7 Pd7 Pe7 Pf7 Pg7 Ph7"
    );
    expect(turnFromFen(start)).toBe("white");
    expect(turnFromFen("not-a-fen")).toBeUndefined();
    expect(legalMovesFromFen(start)).toEqual(expect.arrayContaining(["e4", "Nf3"]));
    expect(legalMovesFromFen("not-a-fen")).toEqual([]);
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
    expect(classifyReviewCoachQuestion("Pourquoi ce coup ?", "fr")).toBe("why_last");
    expect(classifyReviewCoachQuestion("Quelle était la meilleure suite ?", "fr")).toBe(
      "best_line"
    );
    expect(classifyReviewCoachQuestion("Comment jouer cette position ?", "fr")).toBe(
      "how_to_play"
    );
  });

  it("fills last-move identity from the PGN ply when analysis has not reached it", () => {
    const ctx = buildReviewChatContext({
      fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      fenBefore: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      lastMoveSan: "e5",
      lastMoveUci: "e7e5",
      lastMoveSide: "black",
      playerColor: "white",
    });
    expect(ctx?.lastMove).toBe("e5");
    expect(ctx?.lastMoveUci).toBe("e7e5");
    expect(ctx?.sideToMove).toBe("black");
    expect(ctx?.isPlayerMove).toBe(false);
  });

  it("recovers the played move from before/after FENs", () => {
    expect(
      inferPlayedMoveFromFens(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
      )
    ).toEqual({ san: "e4", uci: "e2e4", side: "white" });
  });

  it("hydrates a missing last move from the two FENs", () => {
    const hydrated = hydrateReviewChatContext({
      fenBefore: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      playerColor: "white",
    });
    expect(hydrated?.lastMove).toBe("e5");
    expect(hydrated?.lastMoveUci).toBe("e7e5");
    expect(hydrated?.sideToMove).toBe("black");
    expect(hydrated?.isPlayerMove).toBe(false);
  });

  it("expands why-this-move to name the yellow-arrow ply", () => {
    const expanded = expandReviewCoachUserMessage(
      "Pourquoi ce coup ?",
      {
        lastMove: "Qg7",
        lastMoveUci: "g5g7",
        sideToMove: "black",
        turnToMove: "white",
      },
      "fr"
    );
    expect(expanded).toContain("Dg7");
    expect(expanded).toContain("les Noirs");
    expect(expanded).toContain("N'indique aucun coup à jouer maintenant");
  });

  it("refuses to invent a best continuation before engine data exists", () => {
    const expanded = expandReviewCoachUserMessage(
      "Quelle était la meilleure suite ?",
      {
        lastMove: "Qxg7",
        sideToMove: "black",
        turnToMove: "white",
      },
      "fr"
    );
    expect(expanded).toContain("n'est pas encore disponible");
    expect(expanded).toContain("pas de Cc6");
  });

  it("grounds how-to-play on Stockfish top lines instead of inventing SAN", () => {
    const expanded = expandReviewCoachUserMessage(
      "Comment jouer cette position ?",
      {
        turnToMove: "white",
        engineLinesNow: [
          {
            rank: 1,
            san: "Nf3",
            uci: "g1f3",
            pvSan: ["Nf3", "Nc6"],
            evalWhitePov: 0.32,
          },
          {
            rank: 2,
            san: "d4",
            uci: "d2d4",
            pvSan: ["d4"],
            evalWhitePov: 0.28,
          },
        ],
      },
      "fr"
    );
    expect(expanded).toContain("Cf3");
    expect(expanded).toContain("d4");
    expect(expanded).toContain("UNIQUEMENT");
    expect(expanded).not.toContain("pas encore prêts");
  });

  it("drops engine lines that are illegal on the displayed FEN", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(
      sanitizeEngineLinesNow(start, [
        { rank: 1, san: "e4", uci: "e2e4", pvSan: ["e4"], evalWhitePov: 0.3 },
        { rank: 2, san: "Nc6", uci: "b8c6", pvSan: ["Nc6"], evalWhitePov: 0 },
      ])
    ).toEqual([
      { rank: 1, san: "e4", uci: "e2e4", pvSan: ["e4"], evalWhitePov: 0.3 },
    ]);
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
