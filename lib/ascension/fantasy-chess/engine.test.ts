import { describe, expect, it } from "vitest";
import { FantasyChessEngine } from "@/lib/ascension/fantasy-chess/engine";
import type { FantasyRuleSet } from "@/lib/ascension/fantasy-chess/types";

describe("FantasyChessEngine", () => {
  it("applies standard mate move", () => {
    const engine = new FantasyChessEngine(
      "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
      { enabledAbilities: [] }
    );
    expect(engine.applyMove("h5f7")).toBe(true);
    expect(engine.isObjectiveMet("checkmate")).toBe(true);
  });

  it("allows bishop orthogonal fantasy move", () => {
    const rules: FantasyRuleSet = {
      enabledAbilities: ["bishop_orthogonal"],
      objective: "reach_square",
      objectiveSquare: "e8",
    };
    const engine = new FantasyChessEngine("8/8/8/8/4B3/8/8/2K2k2 w - - 0 1", rules);
    const moves = engine.getLegalMoves("e4" as never);
    expect(moves.some((m) => m.uci === "e4e8" && m.isFantasy)).toBe(true);
    expect(engine.applyMove("e4e8")).toBe(true);
    expect(engine.isObjectiveMet("reach_square")).toBe(true);
  });

  it("allows crazy horse knight diagonal and orthogonal fantasy moves", () => {
    const rules: FantasyRuleSet = {
      enabledAbilities: ["knight_phantom"],
      objective: "reach_square",
      objectiveSquare: "e6",
    };
    const engine = new FantasyChessEngine("8/8/8/8/4N3/8/8/2K2k2 w - - 0 1", rules);
    const moves = engine.getLegalMoves("e4" as never);
    expect(moves.some((m) => m.uci === "e4e6" && m.isFantasy)).toBe(true);
    expect(moves.some((m) => m.uci === "e4b1" && m.isFantasy)).toBe(true);
    expect(engine.applyMove("e4e6")).toBe(true);
    expect(engine.isObjectiveMet("reach_square")).toBe(true);
  });

  it("chains greedy pawn captures without yielding the turn", () => {
    const rules: FantasyRuleSet = {
      enabledAbilities: ["pawn_greedy"],
      objective: "reach_square",
      objectiveSquare: "d6",
    };
    const engine = new FantasyChessEngine("8/8/3p4/2p5/1P6/8/8/2K2k2 w - - 0 1", rules);
    expect(engine.applyMove("b4c5")).toBe(true);
    expect(engine.isGreedyChainActive()).toBe(true);
    expect(engine.turn).toBe("w");
    expect(engine.applyMove("c5d6")).toBe(true);
    expect(engine.isGreedyChainActive()).toBe(false);
    expect(engine.isObjectiveMet("reach_square")).toBe(true);
    expect(
      FantasyChessEngine.replaySolution(
        "8/8/3p4/2p5/1P6/8/8/2K2k2 w - - 0 1",
        rules,
        ["b4c5", "c5d6"]
      ).ok
    ).toBe(true);
  });

  it("validates authored solution replay", () => {
    const result = FantasyChessEngine.replaySolution(
      "8/8/8/8/4R3/3P4/8/2K2k2 w - - 0 1",
      {
        enabledAbilities: ["rook_tunnel"],
        objective: "reach_square",
        objectiveSquare: "e8",
      },
      ["e4e8"]
    );
    expect(result.ok).toBe(true);
  });

  it("detects puzzle solved when history matches", () => {
    const engine = new FantasyChessEngine(
      "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
      { enabledAbilities: [] }
    );
    engine.applyMove("h5f7");
    expect(engine.isPuzzleSolved(["h5f7"])).toBe(true);
  });
});
