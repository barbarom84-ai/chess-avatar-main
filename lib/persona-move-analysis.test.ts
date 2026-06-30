import { describe, expect, it } from "vitest";
import {
  analyzePersonaMoves,
  heatIntensity,
  rollingWinRate,
} from "@/lib/persona-move-analysis";
import type { PersonaGameInput } from "@/lib/analysis";

const SAMPLE_PGN = `[Event "Test"]
[White "testuser"]
[Black "opponent"]
[WhiteElo "1500"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7`;

describe("analyzePersonaMoves", () => {
  it("builds heat map from player moves", () => {
    const games: PersonaGameInput[] = [
      { pgn: SAMPLE_PGN, winner: "white", createdAt: 1_700_000_000_000 },
    ];
    const { heatMap, timeline } = analyzePersonaMoves(games, "testuser");
    expect(heatMap.gamesAnalyzed).toBe(1);
    expect(heatMap.squares["e4"]).toBeGreaterThan(0);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].result).toBe("win");
    expect(timeline[0].rating).toBe(1500);
  });

  it("returns empty analysis when no valid games", () => {
    const { heatMap, timeline } = analyzePersonaMoves([], "testuser");
    expect(heatMap.gamesAnalyzed).toBe(0);
    expect(timeline).toHaveLength(0);
  });
});

describe("heatIntensity", () => {
  it("normalizes to 0-100", () => {
    expect(heatIntensity(5, 10)).toBe(50);
    expect(heatIntensity(0, 10)).toBe(0);
  });
});

describe("rollingWinRate", () => {
  it("computes rolling win rate", () => {
    const timeline = [
      { date: "2024-01-01", timestamp: 1, result: "win" as const, rating: null, moveCount: 20 },
      { date: "2024-01-02", timestamp: 2, result: "loss" as const, rating: null, moveCount: 20 },
      { date: "2024-01-03", timestamp: 3, result: "win" as const, rating: null, moveCount: 20 },
    ];
    const rolling = rollingWinRate(timeline, 2);
    expect(rolling[1].winRate).toBe(50);
    expect(rolling[2].winRate).toBe(50);
  });
});
