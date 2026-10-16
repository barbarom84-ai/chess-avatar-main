import { describe, expect, it } from "vitest";
import {
  ARENA_DEFAULT_TIME_PRESET_ID,
  ARENA_TIME_PRESETS,
  isValidArenaTimePresetId,
  resolveArenaTimePreset,
} from "./arena-time-controls";

describe("ARENA_TIME_PRESETS", () => {
  it("has unique ids (used as React keys)", () => {
    const ids = ARENA_TIME_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only contains timed presets, including bullet 1+0", () => {
    expect(ARENA_TIME_PRESETS.every((p) => p.mode === "timed")).toBe(true);
    expect(isValidArenaTimePresetId("bullet_1_0")).toBe(true);
  });

  it("falls back to the default preset for unknown ids", () => {
    expect(resolveArenaTimePreset("nope").id).toBe(ARENA_DEFAULT_TIME_PRESET_ID);
    expect(resolveArenaTimePreset(null).id).toBe(ARENA_DEFAULT_TIME_PRESET_ID);
  });
});
