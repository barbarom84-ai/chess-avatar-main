import { describe, expect, it } from "vitest";
import {
  ACTIVITY_WINDOW_DAYS,
  bestWinStreak,
  computeAccountStats,
  currentStreak,
  dayStreaks,
  localDateKey,
  pvpCategoryFromPreset,
  type StatsGameRow,
  type StatsInput,
  type StatsPvpRow,
} from "./account-stats";

const ME = "me-id";
const NOW = new Date("2026-10-07T10:00:00Z");

function game(partial: Partial<StatsGameRow> & { created_at: string }): StatsGameRow {
  return {
    id: partial.id ?? partial.created_at,
    result: "win",
    player_color: "white",
    opponent_name: "Magnus Bot",
    duration_seconds: 300,
    moves_count: 40,
    game_kind: "human_vs_bot",
    result_type: "checkmate",
    ...partial,
  };
}

function pvp(partial: Partial<StatsPvpRow> & { updated_at: string }): StatsPvpRow {
  return {
    id: partial.id ?? partial.updated_at,
    white_user_id: ME,
    black_user_id: "friend",
    result: "1-0",
    time_preset: "blitz_5_0",
    white_display_name: "Me",
    black_display_name: "Friend",
    created_at: partial.updated_at,
    ...partial,
  };
}

function input(partial: Partial<StatsInput> = {}): StatsInput {
  return {
    userId: ME,
    games: [],
    pvpGames: [],
    avatars: 0,
    ascension: null,
    league: null,
    now: NOW,
    tzOffsetMinutes: 0,
    ...partial,
  };
}

describe("streak helpers", () => {
  it("computes the current streak from the most recent game", () => {
    const streak = currentStreak([
      { at: 1, outcome: "loss" },
      { at: 2, outcome: "win" },
      { at: 3, outcome: "win" },
    ]);
    expect(streak).toEqual({ outcome: "win", count: 2 });
  });

  it("returns an empty streak without games", () => {
    expect(currentStreak([])).toEqual({ outcome: null, count: 0 });
  });

  it("finds the best win streak chronologically", () => {
    expect(
      bestWinStreak([
        { at: 5, outcome: "win" },
        { at: 1, outcome: "win" },
        { at: 2, outcome: "win" },
        { at: 3, outcome: "draw" },
        { at: 4, outcome: "win" },
      ])
    ).toBe(2);
  });

  it("counts day streaks ending yesterday when today is empty", () => {
    const dates = new Set(["2026-10-04", "2026-10-05", "2026-10-06", "2026-09-01"]);
    expect(dayStreaks(dates, "2026-10-07")).toEqual({ current: 3, best: 3 });
  });
});

describe("localDateKey", () => {
  it("shifts by the browser timezone offset", () => {
    const t = Date.parse("2026-10-06T23:30:00Z");
    expect(localDateKey(t, 0)).toBe("2026-10-06");
    expect(localDateKey(t, -120)).toBe("2026-10-07");
  });
});

describe("pvpCategoryFromPreset", () => {
  it("maps presets to categories", () => {
    expect(pvpCategoryFromPreset("blitz_3_2")).toBe("blitz");
    expect(pvpCategoryFromPreset("correspondence_1d")).toBe("correspondence");
    expect(pvpCategoryFromPreset("unlimited")).toBeNull();
    expect(pvpCategoryFromPreset(null)).toBeNull();
  });
});

describe("computeAccountStats", () => {
  it("returns zeros and a full activity window for an empty account", () => {
    const stats = computeAccountStats(input());
    expect(stats.overview.totalGames).toBe(0);
    expect(stats.overview.winRate).toBe(0);
    expect(stats.overview.lastPlayedAt).toBeNull();
    expect(stats.bots.avgMoves).toBeNull();
    expect(stats.activity.days).toHaveLength(ACTIVITY_WINDOW_DAYS);
    expect(stats.activity.days.at(-1)?.date).toBe("2026-10-07");
    expect(stats.recentGames).toEqual([]);
    expect(stats.achievements.every((a) => !a.unlocked)).toBe(true);
  });

  it("excludes arena and archived games from bot stats", () => {
    const stats = computeAccountStats(
      input({
        games: [
          game({ created_at: "2026-10-01T10:00:00Z" }),
          game({ created_at: "2026-10-02T10:00:00Z", game_kind: "arena_bot_vs_bot" }),
          game({ created_at: "2026-10-03T10:00:00Z", result_type: "pgn_archive" }),
          game({ created_at: "2026-10-04T10:00:00Z", game_kind: "pvp_human_vs_human" }),
        ],
      })
    );
    expect(stats.bots.total).toBe(1);
  });

  it("splits results by color and tracks favorite opponent and play time", () => {
    const stats = computeAccountStats(
      input({
        games: [
          game({ created_at: "2026-10-01T10:00:00Z", player_color: "white", result: "win" }),
          game({ created_at: "2026-10-02T10:00:00Z", player_color: "black", result: "loss", opponent_name: "Tal" }),
          game({ created_at: "2026-10-03T10:00:00Z", player_color: "black", result: "draw" }),
        ],
      })
    );
    expect(stats.bots.asWhite).toEqual({ wins: 1, losses: 0, draws: 0, total: 1 });
    expect(stats.bots.asBlack).toEqual({ wins: 0, losses: 1, draws: 1, total: 2 });
    expect(stats.bots.favoriteOpponent).toEqual({ name: "Magnus Bot", count: 2 });
    expect(stats.bots.totalPlaySeconds).toBe(900);
    expect(stats.bots.avgMoves).toBe(40);
    expect(stats.bots.winRate).toBeCloseTo(33.3);
  });

  it("merges PvP games into overview, streaks and recent games", () => {
    const stats = computeAccountStats(
      input({
        games: [game({ created_at: "2026-10-05T10:00:00Z", result: "win" })],
        pvpGames: [
          pvp({ updated_at: "2026-10-06T10:00:00Z", result: "1-0" }),
          pvp({ updated_at: "2026-10-04T10:00:00Z", result: "0-1", time_preset: "rapid_15_10" }),
          pvp({ updated_at: "2026-10-03T10:00:00Z", result: null }),
        ],
      })
    );
    expect(stats.overview.totalGames).toBe(3);
    expect(stats.overview.currentStreak).toEqual({ outcome: "win", count: 2 });
    expect(stats.pvp).toMatchObject({ total: 2, wins: 1, losses: 1, favoriteCategory: "blitz" });
    expect(stats.pvp.favoriteOpponent).toEqual({ userId: "friend", name: "Friend", count: 2 });
    expect(stats.recentGames.map((g) => g.kind)).toEqual(["pvp", "bot", "pvp"]);
    expect(stats.recentGames[0]?.opponent).toBe("Friend");
  });

  it("ignores rows with invalid dates or unknown results", () => {
    const stats = computeAccountStats(
      input({
        games: [
          game({ created_at: "not-a-date" }),
          game({ created_at: "2026-10-01T10:00:00Z", result: null }),
        ],
      })
    );
    expect(stats.bots.total).toBe(0);
    expect(stats.activity.activeDays).toBe(1);
    expect(stats.recentGames).toHaveLength(1);
  });

  it("detects night play and favorite time of day in local time", () => {
    const stats = computeAccountStats(
      input({
        tzOffsetMinutes: -120,
        games: [
          game({ created_at: "2026-10-05T23:30:00Z" }),
          game({ created_at: "2026-10-05T17:00:00Z" }),
          game({ created_at: "2026-10-05T18:00:00Z" }),
        ],
      })
    );
    expect(stats.activity.playedAtNight).toBe(true);
    expect(stats.activity.favoriteTimeOfDay).toBe("evening");
  });

  it("derives ascension progress from puzzle count", () => {
    const stats = computeAccountStats(
      input({ ascension: { tier: "silver", elo: 1100, xp: 340, puzzlesSolved: 45 } })
    );
    expect(stats.ascension).toEqual({
      tier: "silver",
      elo: 1100,
      xp: 340,
      puzzlesSolved: 45,
      nextTier: "gold",
      toNextTier: 15,
    });
  });
});
