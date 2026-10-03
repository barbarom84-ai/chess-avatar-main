import { describe, expect, it } from "vitest";
import {
  classifyMove,
  computeGameAccuracy,
  winProbability,
  type MoveEvalInput,
} from "./analysis-engine";
import { getAnalysisProfile } from "./analysis-profiles";
import {
  CLASSIFICATION_COLORS,
  buildReviewedMove,
  hashPgn,
  hashReviewCacheKey,
  isObviousCapture,
  sacrificedMaterial,
} from "./game-review";

const standard = getAnalysisProfile("standard");
const relaxed = getAnalysisProfile("relaxed");
const strict = getAnalysisProfile("strict");

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function input(overrides: Partial<MoveEvalInput>): MoveEvalInput {
  return {
    bestEvalPawns: 0,
    playerEvalPawns: 0,
    sideToMove: "white",
    ...overrides,
  };
}

describe("classification glyphs", () => {
  it("marks brilliant with !!, great with ! and misses with ✗", () => {
    expect(CLASSIFICATION_COLORS.brilliant.emoji).toBe("!!");
    expect(CLASSIFICATION_COLORS.great.emoji).toBe("!");
    expect(CLASSIFICATION_COLORS.miss.emoji).toBe("✗");
  });
});

describe("winProbability", () => {
  it("maps 0 to 0.5 and is symmetric between sides", () => {
    expect(winProbability(0, undefined, true)).toBeCloseTo(0.5);
    expect(winProbability(1, undefined, true)).toBeCloseTo(
      1 - winProbability(1, undefined, false)
    );
    expect(winProbability(1, undefined, true)).toBeCloseTo(
      1 / (1 + Math.exp(-0.368208))
    );
  });

  it("gives priority to mate scores", () => {
    expect(winProbability(10, 3, true)).toBe(1);
    expect(winProbability(-10, -2, true)).toBe(0);
    expect(winProbability(-10, -2, false)).toBe(1);
  });
});

describe("sacrificedMaterial", () => {
  it("does not treat a developing pawn as a sacrifice", () => {
    expect(sacrificedMaterial(START, "e2e4")).toBe(0);
    expect(sacrificedMaterial(START, "g1f3")).toBe(0);
  });

  it("counts a bishop left en prise to a pawn (Ba6)", () => {
    expect(
      sacrificedMaterial(
        "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        "f1a6"
      )
    ).toBe(3);
  });

  it("counts Bxf7+ as a two-point sacrifice", () => {
    expect(
      sacrificedMaterial(
        "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        "c4f7"
      )
    ).toBe(2);
  });

  it("returns 0 on invalid input", () => {
    expect(sacrificedMaterial("not a fen", "e2e4")).toBe(0);
    expect(sacrificedMaterial(START, "e2")).toBe(0);
  });
});

describe("isObviousCapture", () => {
  it("detects a recapture on the previous move's square", () => {
    expect(
      isObviousCapture(
        "rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2",
        "d8d5",
        "e4d5"
      )
    ).toBe(true);
  });

  it("detects a free piece capture", () => {
    expect(
      isObviousCapture(
        "rnbqkb1r/pppppppp/8/8/4n3/3P4/PPP1PPPP/RNBQKBNR w KQkq - 0 1",
        "d3e4"
      )
    ).toBe(true);
  });

  it("ignores quiet moves", () => {
    expect(isObviousCapture(START, "e2e4")).toBe(false);
  });
});

describe("classifyMove base classes (expected points lost)", () => {
  const cases: Array<[number, string]> = [
    [0, "best"],
    [0.01, "excellent"],
    [0.04, "good"],
    [0.08, "inaccuracy"],
    [0.15, "mistake"],
    [0.3, "blunder"],
  ];
  for (const [loss, expected] of cases) {
    it(`loss ${loss} → ${expected}`, () => {
      expect(
        classifyMove(input({ bestWin: 0.6, playerWin: 0.6 - loss }), standard)
      ).toBe(expected);
    });
  }

  it("keeps the engine's move as best even with a tiny measured loss", () => {
    expect(
      classifyMove(input({ bestWin: 0.6, playerWin: 0.58, playedIsBest: true }), standard)
    ).toBe("best");
  });

  it("derives win chances from pawn evals when omitted", () => {
    expect(
      classifyMove(input({ bestEvalPawns: 0.5, playerEvalPawns: -3 }), standard)
    ).toBe("blunder");
  });
});

describe("classifyMove strictness scaling", () => {
  it("relaxed widens and strict tightens the bands", () => {
    const loss025 = input({ bestWin: 0.6, playerWin: 0.575 });
    expect(classifyMove(loss025, standard)).toBe("good");
    expect(classifyMove(loss025, relaxed)).toBe("excellent");

    const loss015 = input({ bestWin: 0.6, playerWin: 0.585 });
    expect(classifyMove(loss015, standard)).toBe("excellent");
    expect(classifyMove(loss015, strict)).toBe("good");
  });
});

describe("classifyMove brilliant", () => {
  const sound = {
    bestWin: 0.6,
    playerWin: 0.6,
    playedIsBest: true,
    sacrificedMaterial: 3,
    alternativeWin: 0.55,
  };

  it("promotes a sound sacrifice to brilliant", () => {
    expect(classifyMove(input(sound), standard)).toBe("brilliant");
  });

  it("refuses when the position was already winning without it", () => {
    expect(classifyMove(input({ ...sound, alternativeWin: 0.95 }), standard)).toBe("best");
  });

  it("refuses small sacrifices and unsafe positions", () => {
    expect(classifyMove(input({ ...sound, sacrificedMaterial: 1 }), standard)).toBe("best");
    expect(
      classifyMove(input({ ...sound, bestWin: 0.4, playerWin: 0.4 }), standard)
    ).toBe("best");
  });
});

describe("classifyMove great", () => {
  const only = {
    bestWin: 0.6,
    playerWin: 0.6,
    playedIsBest: true,
    topLineWin: 0.6,
    secondLineWin: 0.35,
  };

  it("labels the only good move as great", () => {
    expect(classifyMove(input(only), standard)).toBe("great");
  });

  it("refuses obvious captures, single lines and small gaps", () => {
    expect(classifyMove(input({ ...only, isObviousCapture: true }), standard)).toBe("best");
    expect(classifyMove(input({ ...only, secondLineWin: undefined }), standard)).toBe("best");
    expect(classifyMove(input({ ...only, secondLineWin: 0.45 }), standard)).toBe("best");
  });

  it("refuses when the position is still lost after the move", () => {
    expect(
      classifyMove(
        input({ ...only, bestWin: 0.3, playerWin: 0.3, topLineWin: 0.3, secondLineWin: 0.05 }),
        standard
      )
    ).toBe("best");
  });
});

describe("classifyMove miss", () => {
  const missed = {
    bestWin: 0.8,
    playerWin: 0.5,
    opponentPrevLoss: 0.2,
  };

  it("labels failing to punish the opponent's mistake as miss", () => {
    expect(classifyMove(input(missed), standard)).toBe("miss");
  });

  it("keeps blunder below the floor", () => {
    expect(classifyMove(input({ ...missed, playerWin: 0.15 }), standard)).toBe("blunder");
  });

  it("requires a previous opponent mistake and a winning position", () => {
    expect(classifyMove(input({ ...missed, opponentPrevLoss: 0.05 }), standard)).toBe(
      "blunder"
    );
    expect(
      classifyMove(input({ ...missed, bestWin: 0.6, playerWin: 0.45 }), standard)
    ).toBe("mistake");
  });

  it("does not apply when the move keeps a winning position", () => {
    expect(
      classifyMove(input({ ...missed, bestWin: 0.9, playerWin: 0.75 }), standard)
    ).toBe("mistake");
  });
});

describe("computeGameAccuracy", () => {
  it("counts provided classifications as-is", () => {
    const res = computeGameAccuracy([
      input({ classification: "great" }),
      input({ classification: "miss" }),
    ]);
    expect(res.classifications.great).toBe(1);
    expect(res.classifications.miss).toBe(1);
  });
});

describe("buildReviewedMove", () => {
  it("keeps book-like zero-CPL moves as best when nothing is offered", () => {
    const m = buildReviewedMove({
      ply: 0,
      san: "e4",
      uci: "e2e4",
      sideToMove: "white",
      evalBefore: 0.2,
      bestMove: "e2e4",
      bestSan: "e4",
      bestEval: 0.3,
      playerEval: 0.3,
      fenBefore: START,
    });
    expect(m.classification).toBe("best");
    expect(m.winLoss).toBe(0);
  });

  it("labels the only good move as great from the second line", () => {
    const m = buildReviewedMove({
      ply: 0,
      san: "e4",
      uci: "e2e4",
      sideToMove: "white",
      evalBefore: 0.3,
      bestMove: "e2e4",
      bestSan: "e4",
      bestEval: 0.3,
      playerEval: 0.3,
      secondEval: -2.5,
      fenBefore: START,
    });
    expect(m.classification).toBe("great");
  });

  it("labels a missed punishment after the opponent's mistake", () => {
    const m = buildReviewedMove({
      ply: 1,
      san: "a6",
      uci: "a7a6",
      sideToMove: "black",
      evalBefore: -4,
      bestMove: "d7d5",
      bestSan: "d5",
      bestEval: -4,
      playerEval: 0,
      opponentPrevLoss: 0.3,
    });
    expect(m.classification).toBe("miss");
    expect(m.winLoss).toBeGreaterThan(0.3);
  });
});

describe("hashReviewCacheKey", () => {
  it("includes the classifier version so older cached reviews are skipped", () => {
    const pgn = "1. e4 e5";
    expect(hashReviewCacheKey(pgn, "standard", 14)).not.toBe(
      hashPgn(`${pgn}\nstrict=standard\ndepth=14`)
    );
  });
});
