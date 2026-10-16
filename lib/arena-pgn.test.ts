import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { buildArenaPgn, countArenaCapturesChecks, pgnTimeControl } from "./arena-pgn";

const date = new Date(2026, 9, 9, 7, 5, 3);

describe("buildArenaPgn", () => {
  it("writes headers, numbered SAN moves and the result", () => {
    const pgn = buildArenaPgn({
      whiteName: 'Magnus "DrNykterstein"',
      blackName: "Hikaru",
      outcome: { pgnResult: "0-1", resultMessage: "Checkmate — Black wins." },
      uciMoves: ["f2f3", "e7e5", "g2g4", "d8h4"],
      timeControl: pgnTimeControl({ initialSec: 180, incrementSec: 2 }),
      date,
    });
    expect(pgn).toContain('[White "Magnus \'DrNykterstein\'"]');
    expect(pgn).toContain('[Date "2026.10.09"]');
    expect(pgn).toContain('[TimeControl "180+2"]');
    expect(pgn).toContain('[Result "0-1"]');
    expect(pgn.trim().endsWith("1. f3 e5 2. g4 Qh4# 0-1")).toBe(true);
  });

  it("supports games in progress", () => {
    const pgn = buildArenaPgn({
      whiteName: "A",
      blackName: "B",
      outcome: { pgnResult: "*", resultMessage: "" },
      uciMoves: ["e2e4"],
      date,
    });
    expect(pgn).toContain('[Result "*"]');
    expect(pgn).not.toContain("Termination");
    expect(pgn.trim().endsWith("1. e4 *")).toBe(true);
  });

  it("stops at an illegal move instead of throwing", () => {
    const pgn = buildArenaPgn({
      whiteName: "A",
      blackName: "B",
      outcome: { pgnResult: "1/2-1/2", resultMessage: "Draw." },
      uciMoves: ["e2e4", "e2e4"],
      date,
    });
    expect(pgn.trim().endsWith("1. e4 1/2-1/2")).toBe(true);
  });

  it("is a valid PGN for chess.js", () => {
    const pgn = buildArenaPgn({
      whiteName: "A",
      blackName: "B",
      outcome: { pgnResult: "1-0", resultMessage: "Mate" },
      uciMoves: ["e2e4", "e7e5", "d1h5", "b8c6", "f1c4", "g8f6", "h5f7"],
      date,
    });
    const g = new Chess();
    g.loadPgn(pgn);
    expect(g.isCheckmate()).toBe(true);
  });
});

describe("countArenaCapturesChecks", () => {
  it("counts captures and checks", () => {
    const g = new Chess();
    for (const m of ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"]) g.move(m);
    expect(countArenaCapturesChecks(g)).toEqual({ captures: 1, checks: 1 });
  });
});
