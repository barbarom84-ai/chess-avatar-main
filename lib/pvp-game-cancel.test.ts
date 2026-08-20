import { describe, expect, it } from "vitest";
import { canUserCancelWaitingPvpGame } from "@/lib/pvp-game-cancel";

describe("canUserCancelWaitingPvpGame", () => {
  it("allows creator to cancel waiting games", () => {
    expect(
      canUserCancelWaitingPvpGame("u1", { status: "waiting", created_by: "u1" })
    ).toBe(true);
  });

  it("denies non-creators and non-waiting games", () => {
    expect(
      canUserCancelWaitingPvpGame("u2", { status: "waiting", created_by: "u1" })
    ).toBe(false);
    expect(
      canUserCancelWaitingPvpGame("u1", { status: "playing", created_by: "u1" })
    ).toBe(false);
  });
});
