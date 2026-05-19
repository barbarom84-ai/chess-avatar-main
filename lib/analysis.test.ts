import { describe, expect, it } from "vitest";
import { analyzePersona } from "./analysis";

const samplePgn = `[Event "Test"]
[White "alice"]
[Black "bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`;

describe("analyzePersona", () => {
  it("returns stats and config for valid games", () => {
    const games = [
      {
        pgn: samplePgn,
        winner: "white" as const,
        players: {
          white: { user: { name: "alice" } },
          black: { user: { name: "bob" } },
        },
      },
    ];
    const { stats, config } = analyzePersona(games, "alice", undefined, "lichess");
    expect(stats.gameCount).toBe(1);
    expect(stats.username).toBe("alice");
    expect(config.elo).toBeGreaterThan(0);
    expect(config.name).toContain("alice");
  });

  it("handles empty game list safely", () => {
    const { stats } = analyzePersona([], "nobody");
    expect(stats.gameCount).toBeGreaterThanOrEqual(0);
    expect(stats.winRate).toBeGreaterThanOrEqual(0);
  });
});
