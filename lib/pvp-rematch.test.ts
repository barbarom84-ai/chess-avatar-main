import { describe, expect, it } from "vitest";
import {
  pvpRematchStartClockPatch,
  pvpRoleInRematchGame,
} from "@/lib/pvp-rematch";

describe("pvpRoleInRematchGame", () => {
  it("returns role for assigned players", () => {
    expect(
      pvpRoleInRematchGame("w1", {
        white_user_id: "w1",
        black_user_id: "b1",
      })
    ).toBe("white");
    expect(
      pvpRoleInRematchGame("b1", {
        white_user_id: "w1",
        black_user_id: "b1",
      })
    ).toBe("black");
    expect(
      pvpRoleInRematchGame("x", {
        white_user_id: "w1",
        black_user_id: "b1",
      })
    ).toBeNull();
  });
});

describe("pvpRematchStartClockPatch", () => {
  it("initializes timed clocks", () => {
    const patch = pvpRematchStartClockPatch({
      clock_mode: "timed",
      clock_initial_sec: 180,
    });
    expect(patch.white_remaining_ms).toBe(180_000);
    expect(patch.black_remaining_ms).toBe(180_000);
    expect(patch.clock_turn_started_at).toBeTruthy();
  });

  it("leaves unlimited clocks empty", () => {
    const patch = pvpRematchStartClockPatch({
      clock_mode: "unlimited",
      clock_initial_sec: 0,
    });
    expect(patch.white_remaining_ms).toBeNull();
    expect(patch.black_remaining_ms).toBeNull();
    expect(patch.clock_turn_started_at).toBeNull();
  });
});
