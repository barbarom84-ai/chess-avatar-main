import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  isOwnPieceOnSquare,
  isPremoveLegalNow,
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
});
