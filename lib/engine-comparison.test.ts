import { describe, expect, it } from "vitest";
import {
  engineOptionsForConfig,
  resolveAvatarBookMove,
} from "@/lib/engine-comparison";
import type { EngineConfig } from "@/lib/analysis";

const baseConfig: EngineConfig = {
  name: "test",
  elo: 1500,
  difficulty: 3,
  aggressiveness: 50,
  threads: 2,
  depth: 12,
  timeControl: 1000,
  favoriteOpening: "Italian",
  playStyle: "équilibré",
  openings: {
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1": "e2e4",
  },
};

describe("engine-comparison", () => {
  it("resolves book move when FEN matches", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(resolveAvatarBookMove(fen, baseConfig, "w")).toBe("e2e4");
  });

  it("returns null when side mismatch", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1";
    expect(resolveAvatarBookMove(fen, baseConfig, "w")).toBeNull();
  });

  it("derives engine options from config", () => {
    const opts = engineOptionsForConfig(baseConfig);
    expect(opts.skill).toBeGreaterThan(0);
    expect(opts.depth).toBe(12);
  });
});
