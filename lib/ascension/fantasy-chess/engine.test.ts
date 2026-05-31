import { describe, expect, it } from "vitest";
import { Chess, type Square } from "chess.js";
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

  it("explodes the landing piece and adjacent pieces while sparing kings", () => {
    const rules: FantasyRuleSet = {
      enabledAbilities: [],
      objective: "checkmate",
      specialSquares: [{ square: "e4", type: "explosive" }],
    };
    // White Ke3 sits next to the explosion; black pawn d5 is adjacent and dies.
    const engine = new FantasyChessEngine("6k1/8/8/3p4/R7/4K3/8/8 w - - 0 1", rules);
    expect(engine.applyMove("a4e4")).toBe(true);

    const board = new Chess(engine.fen);
    expect(board.get("e4" as Square)).toBeFalsy(); // landing rook removed
    expect(board.get("d5" as Square)).toBeFalsy(); // neighbour pawn removed
    expect(board.get("e3" as Square)).toMatchObject({ type: "k", color: "w" }); // king immune
    expect(engine.getTriggeredSquares()).toContain("e4");
  });

  it("removes only the landing piece on a trap square", () => {
    const rules: FantasyRuleSet = {
      enabledAbilities: [],
      objective: "checkmate",
      specialSquares: [{ square: "e4", type: "trap" }],
    };
    const engine = new FantasyChessEngine("6k1/8/8/3p1p2/R7/8/8/6K1 w - - 0 1", rules);
    expect(engine.applyMove("a4e4")).toBe(true);

    const board = new Chess(engine.fen);
    expect(board.get("e4" as Square)).toBeFalsy(); // trapped rook removed
    expect(board.get("d5" as Square)).toMatchObject({ type: "p", color: "b" }); // neighbours untouched
    expect(board.get("f5" as Square)).toMatchObject({ type: "p", color: "b" });
  });

  it("teleports the landing piece through a tunnel, capturing an enemy at the exit", () => {
    const rules: FantasyRuleSet = {
      enabledAbilities: [],
      objective: "reach_square",
      objectiveSquare: "e6",
      specialSquares: [{ square: "e4", type: "tunnel", linkTo: "e6" }],
    };
    const engine = new FantasyChessEngine("6k1/8/4p3/8/R7/8/8/6K1 w - - 0 1", rules);
    expect(engine.applyMove("a4e4")).toBe(true);

    const board = new Chess(engine.fen);
    expect(board.get("e4" as Square)).toBeFalsy(); // left the tunnel entry
    expect(board.get("e6" as Square)).toMatchObject({ type: "r", color: "w" }); // arrived + captured
    expect(engine.isObjectiveMet("reach_square")).toBe(true);

    expect(
      FantasyChessEngine.replaySolution(
        "6k1/8/4p3/8/R7/8/8/6K1 w - - 0 1",
        rules,
        ["a4e4"]
      ).ok
    ).toBe(true);
  });

  it("blocks moving into a tunnel whose exit is occupied by an ally", () => {
    const rules: FantasyRuleSet = {
      enabledAbilities: [],
      objective: "checkmate",
      specialSquares: [{ square: "e4", type: "tunnel", linkTo: "e6" }],
    };
    const engine = new FantasyChessEngine("6k1/8/4P3/8/R7/8/8/6K1 w - - 0 1", rules);
    expect(engine.getLegalMoves("a4" as Square).some((m) => m.uci === "a4e4")).toBe(false);
    expect(engine.applyMove("a4e4")).toBe(false);
  });

  it("chains queen split moves without yielding the turn", () => {
    const rules: FantasyRuleSet = {
      enabledAbilities: ["queen_split"],
      objective: "reach_square",
      objectiveSquare: "e8",
    };
    const engine = new FantasyChessEngine("8/8/8/8/4Q3/8/8/2K2k2 w - - 0 1", rules);
    expect(engine.applyMove("e4e6")).toBe(true);
    expect(engine.isQueenSplitChainActive()).toBe(true);
    expect(engine.turn).toBe("w");
    expect(engine.applyMove("e6e8")).toBe(true);
    expect(engine.isQueenSplitChainActive()).toBe(false);
    expect(engine.isObjectiveMet("reach_square")).toBe(true);
  });

  it("king anchor protects the king from trap squares", () => {
    const rules: FantasyRuleSet = {
      enabledAbilities: ["king_anchor"],
      objective: "checkmate",
      specialSquares: [{ square: "e4", type: "trap" }],
    };
    const engine = new FantasyChessEngine("6k1/8/8/8/8/4K3/8/8 w - - 0 1", rules);
    expect(engine.applyMove("e3e4")).toBe(true);
    const board = new Chess(engine.fen);
    expect(board.get("e4" as Square)).toMatchObject({ type: "k", color: "w" });
  });

  it("removes king on trap without king anchor", () => {
    const rules: FantasyRuleSet = {
      enabledAbilities: [],
      objective: "checkmate",
      specialSquares: [{ square: "e4", type: "trap" }],
    };
    const engine = new FantasyChessEngine("6k1/8/8/8/8/4K3/8/8 w - - 0 1", rules);
    expect(engine.applyMove("e3e4")).toBe(true);
    expect(engine.getTriggeredSquares()).toContain("e4");
  });

  it("blast dodge lets the landing piece survive an explosive center", () => {
    const rules: FantasyRuleSet = {
      enabledAbilities: [],
      passiveSkills: ["blast_dodge"],
      objective: "checkmate",
      specialSquares: [{ square: "e4", type: "explosive" }],
    };
    const engine = new FantasyChessEngine("6k1/8/8/3p4/R7/8/8/6K1 w - - 0 1", rules);
    expect(engine.applyMove("a4e4")).toBe(true);
    const board = new Chess(engine.fen);
    expect(board.get("e4" as Square)).toMatchObject({ type: "r", color: "w" });
    expect(board.get("d5" as Square)).toBeFalsy();
  });
});
