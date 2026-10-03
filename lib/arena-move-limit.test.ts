import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { classifyArenaOutcome as classifyChess } from "./arena-chess";
import { classifyArenaOutcome as classifySpectator } from "./arena-spectator-helpers";
import {
  arenaBotVsBotSide,
  classifyArenaCrushing,
  classifyArenaMoveLimit,
  formatEvalPawns,
  winnerFromCrushingEval,
  winnerFromWhitePovEval,
} from "./arena-move-limit";

describe("winnerFromWhitePovEval", () => {
  it("requires strictly more than 2 pawns", () => {
    expect(winnerFromWhitePovEval(2)).toBeNull();
    expect(winnerFromWhitePovEval(-2)).toBeNull();
    expect(winnerFromWhitePovEval(2.01)).toBe("white");
    expect(winnerFromWhitePovEval(-2.01)).toBe("black");
  });

  it("ignores missing eval", () => {
    expect(winnerFromWhitePovEval(null)).toBeNull();
    expect(winnerFromWhitePovEval(undefined)).toBeNull();
    expect(winnerFromWhitePovEval(Number.NaN)).toBeNull();
  });
});

describe("winnerFromCrushingEval", () => {
  it("awards a win at ±10 inclusive", () => {
    expect(winnerFromCrushingEval(10)).toBe("white");
    expect(winnerFromCrushingEval(-10)).toBe("black");
    expect(winnerFromCrushingEval(9.9)).toBeNull();
    expect(winnerFromCrushingEval(-9.9)).toBeNull();
  });
});

describe("formatEvalPawns", () => {
  it("keeps a sign and one decimal under mate scores", () => {
    expect(formatEvalPawns(2.4)).toBe("+2.4");
    expect(formatEvalPawns(-3.1)).toBe("-3.1");
  });
});

describe("classifyArenaCrushing", () => {
  it("awards White at +10", () => {
    const o = classifyArenaCrushing("fr", 10);
    expect(o?.resultType).toBe("arena_eval_white");
    expect(o?.pgnResult).toBe("1-0");
    expect(o?.resultMessage).toContain("décisif");
  });

  it("returns null below the threshold", () => {
    expect(classifyArenaCrushing("en", 2.4)).toBeNull();
  });
});

describe("classifyArenaMoveLimit", () => {
  it("awards White when eval is winning", () => {
    const o = classifyArenaMoveLimit("fr", 2.4);
    expect(o.result).toBe("win");
    expect(o.resultType).toBe("arena_move_limit_white");
    expect(o.pgnResult).toBe("1-0");
    expect(o.resultMessage).toContain("blancs");
    expect(o.resultMessage).toContain("+2.4");
  });

  it("awards Black when eval is winning", () => {
    const o = classifyArenaMoveLimit("en", -3);
    expect(o.result).toBe("loss");
    expect(o.resultType).toBe("arena_move_limit_black");
    expect(o.pgnResult).toBe("0-1");
    expect(o.resultMessage).toContain("Black wins");
  });

  it("draws when the gap is 2 pawns or less", () => {
    const o = classifyArenaMoveLimit("en", 1.9);
    expect(o.result).toBe("draw");
    expect(o.resultType).toBe("arena_move_limit");
    expect(o.pgnResult).toBe("1/2-1/2");
  });
});

describe("classifyArenaOutcome move limit", () => {
  it("uses eval in spectator and playoff classifiers", () => {
    const game = new Chess();
    const crush = classifySpectator(game, false, "en", 10);
    expect(crush.resultType).toBe("arena_eval_white");
    expect(crush.pgnResult).toBe("1-0");

    const spec = classifySpectator(game, true, "en", 3.2);
    expect(spec.resultType).toBe("arena_move_limit_white");
    expect(spec.pgnResult).toBe("1-0");

    const play = classifyChess(game, true, "fr", undefined, -4);
    expect(play.resultType).toBe("arena_move_limit_black");
    expect(play.winner).toBe("black");
  });
});

describe("arenaBotVsBotSide", () => {
  it("maps move-limit, eval wins, and playoff prefixes", () => {
    expect(arenaBotVsBotSide("arena_move_limit_white")).toBe("white");
    expect(arenaBotVsBotSide("arena_eval_white")).toBe("white");
    expect(arenaBotVsBotSide("arena_playoff_arena_move_limit_black")).toBe(
      "black"
    );
    expect(arenaBotVsBotSide("arena_playoff_arena_eval_black")).toBe("black");
    expect(arenaBotVsBotSide("arena_move_limit", "draw")).toBe("draw");
    expect(arenaBotVsBotSide("arena_timeout", "win")).toBe("white");
  });
});
