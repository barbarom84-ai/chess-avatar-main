import { describe, expect, it } from "vitest";
import { FantasyChessEngine } from "@/lib/ascension/fantasy-chess/engine";
import { transformLichessToFantasy } from "@/lib/ascension/fantasy-puzzle-transform";
import { validateStandardPuzzleLine } from "@/lib/ascension/puzzle-validation";

describe("transformLichessToFantasy", () => {
  it("infers bishop_orthogonal when the standard line is illegal", () => {
    const fen = "8/8/8/8/4B3/8/8/2K2k2 w - - 0 1";
    const solution = ["e4e8"];
    expect(validateStandardPuzzleLine(fen, solution).ok).toBe(false);

    const result = transformLichessToFantasy(fen, solution, ["advantage"]);
    expect(result.source).toBe("ability");
    expect(result.fantasy_rules.enabledAbilities).toEqual(["bishop_orthogonal"]);
    expect(result.fantasy_rules.objective).toBe("reach_square");
    expect(result.fantasy_rules.objectiveSquare).toBe("e8");
    expect(FantasyChessEngine.replaySolution(fen, result.fantasy_rules, solution).ok).toBe(
      true
    );
    expect(result.prompt.en).toContain("orthogonal bishop");
    expect(result.hints.length).toBeGreaterThan(0);
  });

  it("infers rook_tunnel when the standard line is illegal", () => {
    const fen = "8/8/4P3/8/4R3/8/8/2K2k2 w - - 0 1";
    const solution = ["e4e8"];
    expect(validateStandardPuzzleLine(fen, solution).ok).toBe(false);

    const result = transformLichessToFantasy(fen, solution, ["advantage"]);
    expect(result.source).toBe("ability");
    expect(result.fantasy_rules.enabledAbilities).toEqual(["rook_tunnel"]);
    expect(FantasyChessEngine.replaySolution(fen, result.fantasy_rules, solution).ok).toBe(
      true
    );
  });

  it("infers a tunnel special square for the seed tunnel position", () => {
    const fen = "6k1/8/4p3/8/R7/8/8/6K1 w - - 0 1";
    const solution = ["a4e4"];
    expect(validateStandardPuzzleLine(fen, solution).ok).toBe(true);

    const result = transformLichessToFantasy(fen, solution, ["hangingPiece"]);
    expect(result.source).toBe("special_square");
    expect(result.fantasy_rules.specialSquares?.[0]).toMatchObject({
      square: "e4",
      type: "tunnel",
      linkTo: "e6",
    });
    expect(FantasyChessEngine.replaySolution(fen, result.fantasy_rules, solution).ok).toBe(
      true
    );
    expect(result.prompt.fr).toContain("Tunnel");
  });

  it("falls back to checkmate for a standard mate-in-1 puzzle", () => {
    const fen = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";
    const solution = ["h5f7"];
    expect(validateStandardPuzzleLine(fen, solution).ok).toBe(true);

    const result = transformLichessToFantasy(fen, solution, ["mateIn1", "short"]);
    expect(result.source).toBe("fallback");
    expect(result.fantasy_rules.enabledAbilities).toEqual([]);
    expect(result.fantasy_rules.objective).toBe("checkmate");
    expect(FantasyChessEngine.replaySolution(fen, result.fantasy_rules, solution).ok).toBe(
      true
    );
  });

  it("falls back to reach_square when no fantasy mechanic applies", () => {
    const fen = "r1bqkb1r/pppp2pp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4";
    const solution = ["f3e5"];
    expect(validateStandardPuzzleLine(fen, solution).ok).toBe(true);

    const result = transformLichessToFantasy(fen, solution, ["fork"]);
    expect(["fallback", "special_square"]).toContain(result.source);
    expect(result.fantasy_rules.objective).toBe("reach_square");
    if (result.source === "fallback") {
      expect(result.fantasy_rules.objectiveSquare).toBe("e5");
    } else {
      expect(result.fantasy_rules.specialSquares?.length).toBeGreaterThan(0);
    }
    expect(FantasyChessEngine.replaySolution(fen, result.fantasy_rules, solution).ok).toBe(
      true
    );
  });
});
