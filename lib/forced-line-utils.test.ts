import { describe, expect, it } from "vitest";
import {
  normalizeEngineConfigForcedLines,
  prepareConfigForExport,
} from "./forced-line-utils";
import type { EngineConfig } from "./analysis";

function baseConfig(overrides: Partial<EngineConfig> = {}): EngineConfig {
  return {
    name: "test",
    elo: 1500,
    difficulty: 3,
    aggressiveness: 50,
    threads: 2,
    depth: 12,
    timeControl: 500,
    favoriteOpening: "",
    playStyle: "équilibré",
    openings: {},
    ...overrides,
  };
}

describe("normalizeEngineConfigForcedLines", () => {
  it("splits legacy forcedLine into white and black", () => {
    const next = normalizeEngineConfigForcedLines(
      baseConfig({ forcedLine: ["e2e4", "e7e5", "g1f3"] })
    );
    expect(next.forcedLine).toBeUndefined();
    expect(next.forcedLineWhite).toEqual(["e2e4", "g1f3"]);
    expect(next.forcedLineBlack).toEqual(["e7e5"]);
  });

  it("keeps explicit white/black lines", () => {
    const next = normalizeEngineConfigForcedLines(
      baseConfig({
        forcedLineWhite: ["d2d4"],
        forcedLineBlack: ["d7d5"],
        forcedLine: ["e2e4"],
      })
    );
    expect(next.forcedLineWhite).toEqual(["d2d4"]);
    expect(next.forcedLineBlack).toEqual(["d7d5"]);
    expect(next.forcedLine).toBeUndefined();
  });
});

describe("prepareConfigForExport strength", () => {
  it("stamps skill/uciElo for a ~1500 bot (not Stockfish skill 20)", () => {
    const exported = prepareConfigForExport(baseConfig({ elo: 1500, difficulty: 3 }));
    expect(exported.skill).toBe(9);
    expect(exported.uciElo).toBe(1500);
    expect(exported.uciLimitStrength).toBe(true);
  });

  it("disables LimitStrength for difficulty 4+", () => {
    const exported = prepareConfigForExport(baseConfig({ elo: 2200, difficulty: 4 }));
    expect(exported.skill).toBe(15);
    expect(exported.uciElo).toBe(2200);
    expect(exported.uciLimitStrength).toBe(false);
  });
});
