import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  ARENA_MAIN_THINK_MS,
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
    expect(getArenaThinkBudgetMs(false, 19_000)).toBe(ARENA_ZEITNOT_THINK_MS);
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
