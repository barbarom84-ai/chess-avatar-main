import { describe, expect, it } from "vitest";
import { normalizeEngineConfigForcedLines } from "./forced-line-utils";
import type { EngineConfig } from "./analysis";

describe("normalizeEngineConfigForcedLines", () => {
  it("splits legacy forcedLine into white and black", () => {
    const config: EngineConfig = {
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
      forcedLine: ["e2e4", "e7e5", "g1f3"],
    };
    const next = normalizeEngineConfigForcedLines(config);
    expect(next.forcedLine).toBeUndefined();
    expect(next.forcedLineWhite).toEqual(["e2e4", "g1f3"]);
    expect(next.forcedLineBlack).toEqual(["e7e5"]);
  });

  it("keeps explicit white/black lines", () => {
    const config: EngineConfig = {
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
      forcedLineWhite: ["d2d4"],
      forcedLineBlack: ["d7d5"],
      forcedLine: ["e2e4"],
    };
    const next = normalizeEngineConfigForcedLines(config);
    expect(next.forcedLineWhite).toEqual(["d2d4"]);
    expect(next.forcedLineBlack).toEqual(["d7d5"]);
    expect(next.forcedLine).toBeUndefined();
  });
});
