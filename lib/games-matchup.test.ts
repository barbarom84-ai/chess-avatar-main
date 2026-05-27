import { describe, expect, it } from "vitest";
import { matchupTitleFromStoredGame, isHumanVsBotOnly } from "./games-matchup";
import type { DbGame } from "@/lib/supabase-storage";

function baseGame(overrides: Partial<DbGame> = {}): DbGame {
  return {
    id: "g1",
    user_id: "u1",
    opponent_name: "Opponent",
    result: "win",
    pgn: "",
    moves_count: 10,
    created_at: new Date().toISOString(),
    ...overrides,
  } as DbGame;
}

describe("matchupTitleFromStoredGame", () => {
  it("uses White/Black tags when present", () => {
    const game = baseGame({
      pgn: '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5',
    });
    expect(matchupTitleFromStoredGame(game)).toBe("Alice vs Bob");
  });

  it("falls back to opponent_name without tags", () => {
    expect(matchupTitleFromStoredGame(baseGame())).toBe("Opponent");
  });
});

describe("isHumanVsBotOnly", () => {
  it("excludes arena bot vs bot", () => {
    const game = baseGame({ game_kind: "arena_bot_vs_bot" });
    expect(isHumanVsBotOnly(game)).toBe(false);
  });
});
