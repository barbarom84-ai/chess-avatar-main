import { describe, expect, it } from "vitest";
import type { PvpActiveGameSummary } from "@/lib/api-contract";
import { pickBannerGames, pvpActiveGameIsMyTurn } from "@/lib/pvp-active-games";

describe("pvpActiveGameIsMyTurn", () => {
  it("white to move on even move counts", () => {
    expect(pvpActiveGameIsMyTurn("white", 0)).toBe(true);
    expect(pvpActiveGameIsMyTurn("white", 2)).toBe(true);
    expect(pvpActiveGameIsMyTurn("white", 1)).toBe(false);
  });

  it("black to move on odd move counts", () => {
    expect(pvpActiveGameIsMyTurn("black", 1)).toBe(true);
    expect(pvpActiveGameIsMyTurn("black", 3)).toBe(true);
    expect(pvpActiveGameIsMyTurn("black", 0)).toBe(false);
  });
});

function active(id: string, opts: Partial<PvpActiveGameSummary> = {}): PvpActiveGameSummary {
  return {
    id,
    created_at: "2026-10-05T17:00:00.000Z",
    updated_at: "2026-10-05T17:00:00.000Z",
    role: "white",
    opponent_user_id: "opp",
    opponent_display_name: "LabBot A",
    opponent_avatar_url: null,
    time_preset: "blitz_5_3",
    clock_mode: "timed",
    clock_initial_sec: 300,
    clock_increment_sec: 3,
    move_count: 0,
    is_my_turn: false,
    ...opts,
  };
}

describe("pickBannerGames", () => {
  it("leaves out correspondence games and the game being viewed", () => {
    const games = [active("live"), active("corr", { clock_mode: "correspondence" }), active("viewed")];
    expect(pickBannerGames(games, "viewed").map((g) => g.id)).toEqual(["live"]);
  });

  it("puts games where it's the player's turn first, then the most recent", () => {
    const games = [
      active("old-waiting", { updated_at: "2026-10-05T17:01:00.000Z" }),
      active("my-turn", { is_my_turn: true, updated_at: "2026-10-05T17:00:00.000Z" }),
      active("new-waiting", { updated_at: "2026-10-05T17:05:00.000Z" }),
    ];
    expect(pickBannerGames(games, null).map((g) => g.id)).toEqual(["my-turn", "new-waiting", "old-waiting"]);
  });
});
