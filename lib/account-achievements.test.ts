import { describe, expect, it } from "vitest";
import { computeAccountStats, type StatsGameRow } from "./account-stats";

function wins(count: number): StatsGameRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `g${i}`,
    result: "win",
    player_color: "white",
    opponent_name: "Bot",
    duration_seconds: 60,
    moves_count: 30,
    created_at: new Date(Date.UTC(2026, 8, 1 + i, 12)).toISOString(),
  }));
}

function byId(stats: ReturnType<typeof computeAccountStats>) {
  return Object.fromEntries(stats.achievements.map((a) => [a.id, a]));
}

describe("computeAchievements", () => {
  const base = {
    userId: "me",
    pvpGames: [],
    league: null,
    now: new Date("2026-10-07T10:00:00Z"),
    tzOffsetMinutes: 0,
  };

  it("unlocks game milestones and streaks", () => {
    const a = byId(computeAccountStats({ ...base, games: wins(12), avatars: 2, ascension: null }));
    expect(a.first_game?.unlocked).toBe(true);
    expect(a.first_win?.unlocked).toBe(true);
    expect(a.games_10?.unlocked).toBe(true);
    expect(a.win_streak_5?.unlocked).toBe(true);
    expect(a.regular?.unlocked).toBe(true);
    expect(a.games_50).toMatchObject({ unlocked: false, progress: 12, target: 50 });
    expect(a.collector).toMatchObject({ unlocked: false, progress: 2, target: 5 });
  });

  it("caps progress at the target", () => {
    const a = byId(computeAccountStats({ ...base, games: [], avatars: 9, ascension: null }));
    expect(a.collector).toMatchObject({ unlocked: true, progress: 5, target: 5 });
  });

  it("uses the ascension tier", () => {
    const a = byId(
      computeAccountStats({
        ...base,
        games: [],
        avatars: 0,
        ascension: { tier: "silver", elo: 0, xp: 0, puzzlesSolved: 45 },
      })
    );
    expect(a.ascension_bronze?.unlocked).toBe(true);
    expect(a.ascension_gold?.unlocked).toBe(false);
  });
});
