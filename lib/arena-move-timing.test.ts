import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  ARENA_MAIN_THINK_MS,
  ARENA_MIN_THINK_MS,
  ARENA_THEORETICAL_THINK_MS,
  ARENA_ZEITNOT_THINK_MS,
  getArenaMoveDisplayDelayMs,
  getArenaMoveParams,
  getArenaPhase,
  getArenaThinkBudgetMs,
  getArenaThinkMode,
  getSingleLegalMoveUci,
  isArenaTheoreticalOpening,
} from "./arena-move-timing";
import type { EngineConfig } from "./analysis";

const baseConfig: EngineConfig = {
  name: "test",
  elo: 2000,
  difficulty: 4,
  aggressiveness: 50,
  threads: 2,
  depth: 14,
  timeControl: 500,
  favoriteOpening: "",
  playStyle: "équilibré",
  openings: {},
};

const blitz3 = { initialSec: 180, incrementSec: 0 };

describe("getArenaPhase", () => {
  it("returns opening for early plies", () => {
    expect(getArenaPhase(0, new Chess())).toBe("opening");
  });
});

describe("getArenaThinkBudgetMs", () => {
  it("uses 3s after theoretical opening", () => {
    expect(getArenaThinkBudgetMs(false)).toBe(ARENA_MAIN_THINK_MS);
    expect(ARENA_MAIN_THINK_MS).toBe(3000);
  });

  it("uses zero budget for single legal move", () => {
    expect(getArenaThinkBudgetMs(false, undefined, true)).toBe(0);
  });

  it("uses short budget during theoretical opening", () => {
    expect(getArenaThinkBudgetMs(true)).toBe(ARENA_THEORETICAL_THINK_MS);
  });

  it("uses zeitnot budget under 20 seconds", () => {
    expect(getArenaThinkBudgetMs(false)).toBe(ARENA_MAIN_THINK_MS);
    expect(getArenaThinkBudgetMs(false, 19_000)).toBeLessThanOrEqual(ARENA_ZEITNOT_THINK_MS);
    expect(getArenaThinkBudgetMs(false, 19_000)).toBe(633);
  });

  it("scales with the selected speed", () => {
    const fast = getArenaThinkBudgetMs(false, undefined, false, "fast");
    const normal = getArenaThinkBudgetMs(false, undefined, false, "normal");
    const realistic = getArenaThinkBudgetMs(false, undefined, false, "realistic");
    expect(fast).toBeLessThan(normal);
    expect(realistic).toBeGreaterThan(normal);
    expect(getArenaThinkBudgetMs(true, undefined, false, "fast")).toBeLessThan(
      ARENA_THEORETICAL_THINK_MS
    );
  });

  it("never spends more than 1/25 of a comfortable clock", () => {
    expect(getArenaThinkBudgetMs(false, 30_000, false, "realistic")).toBe(1_200);
    expect(getArenaThinkBudgetMs(false, 600_000, false, "realistic")).toBe(6_000);
  });

  it("spends only 1/30 of the remaining time in zeitnot", () => {
    expect(getArenaThinkBudgetMs(false, 15_000)).toBe(500);
    expect(getArenaThinkBudgetMs(false, 900)).toBe(ARENA_MIN_THINK_MS);
    expect(getArenaThinkBudgetMs(false, 19_500, false, "fast")).toBe(650);
  });

  it("survives a long 1+0 game without increment", () => {
    let clock = 60_000;
    for (let move = 0; move < 100; move++) {
      clock -= getArenaThinkBudgetMs(false, clock, false, "realistic");
      expect(clock).toBeGreaterThan(0);
    }
  });
});

describe("getArenaMoveParams", () => {
  it("main mode uses 3 second movetime", () => {
    const main = getArenaMoveParams(
      baseConfig,
      "middlegame",
      14,
      blitz3,
      ARENA_MAIN_THINK_MS,
      "main"
    );
    expect(main.timeControl).toBe(3000);
    expect(main.depth).toBeGreaterThanOrEqual(12);
  });

  it("zeitnot mode is faster than main", () => {
    const main = getArenaMoveParams(
      baseConfig,
      "middlegame",
      14,
      blitz3,
      ARENA_MAIN_THINK_MS,
      "main"
    );
    const fast = getArenaMoveParams(
      baseConfig,
      "middlegame",
      14,
      blitz3,
      ARENA_ZEITNOT_THINK_MS,
      "zeitnot"
    );
    expect(fast.timeControl).toBeLessThan(main.timeControl);
  });
});

describe("getSingleLegalMoveUci", () => {
  it("returns uci when only one legal move", () => {
    const g = new Chess("8/8/8/8/8/8/1k6/K7 w - - 0 1");
    expect(getSingleLegalMoveUci(g)).toBe("a1b2");
  });

  it("returns null when multiple legal moves", () => {
    expect(getSingleLegalMoveUci(new Chess())).toBeNull();
  });
});

describe("isArenaTheoreticalOpening", () => {
  it("treats early plies as theoretical when no book", () => {
    expect(isArenaTheoreticalOpening(baseConfig, 8, [])).toBe(true);
    expect(isArenaTheoreticalOpening(baseConfig, 20, [])).toBe(false);
  });
});

describe("getArenaMoveDisplayDelayMs", () => {
  it("returns minimal UI pause", () => {
    expect(getArenaMoveDisplayDelayMs("middlegame", 5000, "spectator")).toBe(80);
  });
});

describe("getArenaThinkMode", () => {
  it("prioritizes theoretical over zeitnot", () => {
    expect(getArenaThinkMode(true, 10_000)).toBe("theoretical");
  });
});
