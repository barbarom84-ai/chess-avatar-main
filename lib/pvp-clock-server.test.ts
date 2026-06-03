import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { applyMoveClockUpdate, checkTimeoutForTimedGame } from "@/lib/pvp-clock-server";

function correspondenceGame(overrides: Partial<PvpGameRow> = {}): PvpGameRow {
  return {
    id: "g1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: "u1",
    white_user_id: "u1",
    black_user_id: "u2",
    status: "playing",
    result: null,
    result_reason: null,
    draw_offered_by: null,
    clock_mode: "correspondence",
    clock_initial_sec: 3 * 86_400,
    clock_increment_sec: 0,
    time_preset: "correspondence_3d",
    white_remaining_ms: null,
    black_remaining_ms: null,
    clock_turn_started_at: new Date(Date.now() - 4 * 86_400 * 1000).toISOString(),
    ...overrides,
  };
}

describe("correspondence clock", () => {
  it("flags timeout when move budget exceeded", () => {
    const row = correspondenceGame();
    const chess = new Chess();
    const timeout = checkTimeoutForTimedGame(row, chess, Date.now());
    expect(timeout?.result).toBe("0-1");
    expect(timeout?.result_reason).toBe("timeout");
  });

  it("resets turn deadline after a legal move window", () => {
    const row = correspondenceGame({
      clock_turn_started_at: new Date(Date.now() - 86_400 * 1000).toISOString(),
    });
    const chess = new Chess();
    const tick = applyMoveClockUpdate(row, chess, Date.now());
    expect(tick.kind).toBe("tick");
    if (tick.kind === "tick") {
      expect(tick.clock_turn_started_at).toBeTruthy();
    }
  });
});
