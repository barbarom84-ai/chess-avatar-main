import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  arenaForfeitOutcome,
  classifyArenaOutcome,
  replayUci,
  stmEvalToWhitePov,
} from "./arena-chess";

function fromSan(moves: string[]): Chess {
  const g = new Chess();
  for (const m of moves) g.move(m);
  return g;
}

describe("classifyArenaOutcome", () => {
  it("detects checkmate for either side", () => {
    const foolsMate = fromSan(["f3", "e5", "g4", "Qh4#"]);
    expect(classifyArenaOutcome(foolsMate, false, "en")).toMatchObject({
      winner: "black",
      pgnResult: "0-1",
      resultType: "arena_black_wins",
    });
    const scholars = fromSan(["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"]);
    expect(classifyArenaOutcome(scholars, false, "fr")).toMatchObject({
      winner: "white",
      pgnResult: "1-0",
    });
  });

  it("names the draw reason", () => {
    const stalemate = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(classifyArenaOutcome(stalemate, false, "en")).toMatchObject({
      winner: "draw",
      resultType: "arena_draw_stalemate",
    });

    const bare = new Chess("8/8/8/4k3/8/8/8/4K3 w - - 0 1");
    expect(classifyArenaOutcome(bare, false, "fr").resultType).toBe("arena_draw_insufficient");

    const repetition = fromSan(["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]);
    expect(classifyArenaOutcome(repetition, false, "en")).toMatchObject({
      winner: "draw",
      resultType: "arena_draw_threefold",
      resultMessage: "Draw — threefold repetition.",
    });
  });

  it("gives priority to a timeout", () => {
    const o = classifyArenaOutcome(new Chess(), false, "fr", "black");
    expect(o).toMatchObject({ winner: "black", resultType: "arena_timeout", pgnResult: "0-1" });
  });

  it("ends on a crushing eval before the move limit", () => {
    expect(classifyArenaOutcome(new Chess(), true, "en", undefined, -12).winner).toBe("black");
  });

  it("decides the move limit on eval, draws when close", () => {
    expect(classifyArenaOutcome(new Chess(), true, "en", undefined, 2.5).winner).toBe("white");
    expect(classifyArenaOutcome(new Chess(), true, "en", undefined, 0.4).winner).toBe("draw");
    expect(classifyArenaOutcome(new Chess(), true, "en", undefined, null).winner).toBe("draw");
  });
});

describe("arenaForfeitOutcome", () => {
  it("awards the game to the opponent", () => {
    expect(arenaForfeitOutcome("white", "en")).toMatchObject({ winner: "black", pgnResult: "0-1" });
    expect(arenaForfeitOutcome("black", "fr")).toMatchObject({ winner: "white", result: "win" });
  });
});

describe("replayUci", () => {
  it("replays promotions and stops at the first illegal move", () => {
    const g = replayUci(["e2e4", "e7e5", "e1e3", "g1f3"]);
    expect(g.history()).toEqual(["e4", "e5"]);
    const promo = replayUci(["a2a4", "b7b5", "a4b5", "a7a6", "b5a6", "c8b7", "a6b7", "b8c6", "b7a8q"]);
    expect(promo.history().at(-1)).toBe("bxa8=Q");
  });
});

describe("stmEvalToWhitePov", () => {
  it("flips the sign when Black is to move", () => {
    const afterE4 = replayUci(["e2e4"]).fen();
    expect(stmEvalToWhitePov(afterE4, 0.5)).toBe(-0.5);
    expect(stmEvalToWhitePov(new Chess().fen(), 0.5)).toBe(0.5);
  });
});
