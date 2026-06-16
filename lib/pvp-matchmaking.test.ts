import { describe, expect, it } from "vitest";
import { isMatchmakingEligiblePreset } from "@/lib/pvp-matchmaking";

describe("isMatchmakingEligiblePreset", () => {
  it("accepts live timed presets", () => {
    expect(isMatchmakingEligiblePreset("blitz_3_0")).toBe(true);
    expect(isMatchmakingEligiblePreset("bullet_1_0")).toBe(true);
  });

  it("rejects correspondence and invalid presets", () => {
    expect(isMatchmakingEligiblePreset("correspondence_3d")).toBe(false);
    expect(isMatchmakingEligiblePreset("not_a_preset")).toBe(false);
  });
});
