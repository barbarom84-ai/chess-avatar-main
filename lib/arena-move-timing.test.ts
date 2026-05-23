import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  getArenaMoveDisplayDelayMs,
  getArenaMoveParams,
  getArenaPhase,
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

describe("getArenaPhase", () => {
  it("returns opening for early plies", () => {
    expect(getArenaPhase(0, new Chess())).toBe("opening");
    expect(getArenaPhase(10, new Chess())).toBe("opening");
  });

  it("returns middlegame in mid game with full material", () => {
    const g = new Chess();
    expect(getArenaPhase(20, g)).toBe("middlegame");
  });

  it("returns endgame with few pieces", () => {
    const g = new Chess("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
    expect(getArenaPhase(20, g)).toBe("endgame");
  });
});

describe("getArenaMoveParams", () => {
  it("opening movetime is less than middlegame and endgame", () => {
    const opening = getArenaMoveParams(baseConfig, "opening", 10);
    const middle = getArenaMoveParams(baseConfig, "middlegame", 10);
    const end = getArenaMoveParams(baseConfig, "endgame", 10);

    expect(opening.timeControl).toBeLessThan(middle.timeControl);
    expect(middle.timeControl).toBeLessThan(end.timeControl);
    expect(opening.depth).toBeLessThanOrEqual(8);
    expect(middle.depth).toBe(10);
  });
});

describe("getArenaMoveDisplayDelayMs", () => {
  it("respects phase minimum display", () => {
    expect(getArenaMoveDisplayDelayMs("opening", 200)).toBeGreaterThanOrEqual(
      320
    );
  });
});
