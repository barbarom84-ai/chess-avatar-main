import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  isOwnPieceOnSquare,
  isPremoveLegalNow,
  premoveDestinations,
  premoveUciFromSquares,
  premoveArrowFromUci,
} from "@/lib/pvp-premove";

describe("pvp-premove", () => {
  it("builds UCI from squares", () => {
    expect(premoveUciFromSquares(new Chess().fen(), "e2", "e4")).toBe("e2e4");
  });

  it("detects own piece on square", () => {
    const fen = new Chess().fen();
    expect(isOwnPieceOnSquare(fen, "e2", "white")).toBe(true);
    expect(isOwnPieceOnSquare(fen, "e7", "white")).toBe(false);
  });

  it("validates premove legality on current position", () => {
    const fen = new Chess().fen();
    expect(isPremoveLegalNow(fen, "e2e4")).toBe(true);
    expect(isPremoveLegalNow(fen, "e2e5")).toBe(false);
  });

  it("parses premove arrow", () => {
    expect(premoveArrowFromUci("e2e4")).toEqual({ from: "e2", to: "e4" });
  });

  describe("premoveDestinations", () => {
    const sorted = (fen: string, sq: string) => premoveDestinations(fen, sq).sort();
    const afterE4E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

    it("lets the side not to move pick knight squares, including own-occupied ones", () => {
      expect(sorted(afterE4E5, "g8")).toEqual(["e7", "f6", "h6"]);
    });

    it("gives pawns the push, the double push from the start rank and both diagonals", () => {
      expect(sorted(afterE4E5, "d7")).toEqual(["c6", "d5", "d6", "e6"]);
      expect(sorted(afterE4E5, "e5")).toEqual(["d4", "e4", "f4"]);
    });

    it("lets sliders run through blockers to the edge", () => {
      expect(sorted(afterE4E5, "f8")).toEqual(["a3", "b4", "c5", "d6", "e7", "g7", "h6"]);
    });

    it("offers castling only while the right is kept", () => {
      expect(sorted(afterE4E5, "e8")).toEqual(["c8", "d7", "d8", "e7", "f7", "f8", "g8"]);
      const noRights = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQ - 0 2";
      expect(sorted(noRights, "e8")).toEqual(["d7", "d8", "e7", "f7", "f8"]);
    });

    it("returns nothing for an empty square", () => {
      expect(premoveDestinations(afterE4E5, "e3")).toEqual([]);
    });
  });
});
