import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { getPvpClockDisplayMs, isPvpSideToMoveTimedOut, formatClockMsPrecise } from "@/lib/pvp-clock";

function timedGame(overrides: Partial<PvpGameRow> = {}): PvpGameRow {
  const now = Date.now();
  return {
    id: "g1",
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
    created_by: "u1",
    white_user_id: "u1",
    black_user_id: "u2",
    status: "playing",
    result: null,
    result_reason: null,
    draw_offered_by: null,
    clock_mode: "timed",
    clock_initial_sec: 180,
    clock_increment_sec: 0,
    time_preset: "blitz_3_0",
    white_remaining_ms: 5000,
    black_remaining_ms: 180_000,
    clock_turn_started_at: new Date(now - 6000).toISOString(),
    ...overrides,
  };
}

describe("isPvpSideToMoveTimedOut", () => {
  it("returns true when active side elapsed past remaining time", () => {
    const game = timedGame();
    const chess = new Chess();
    expect(chess.turn()).toBe("w");
    expect(isPvpSideToMoveTimedOut(game, chess.turn(), Date.now())).toBe(true);
  });

  it("returns false when active side still has time", () => {
    const now = Date.now();
    const game = timedGame({
      white_remaining_ms: 60_000,
      clock_turn_started_at: new Date(now - 1000).toISOString(),
    });
    const chess = new Chess();
    expect(isPvpSideToMoveTimedOut(game, chess.turn(), now)).toBe(false);
  });

  it("matches display helper at zero boundary", () => {
    const game = timedGame();
    const chess = new Chess();
    const now = Date.now();
    const display = getPvpClockDisplayMs(game, chess.turn(), now);
    const activeMs = display.active === "w" ? display.whiteMs : display.blackMs;
    expect(isPvpSideToMoveTimedOut(game, chess.turn(), now)).toBe(activeMs <= 0);
  });
});

describe("formatClockMsPrecise", () => {
  it("formats minutes, seconds and milliseconds", () => {
    expect(formatClockMsPrecise(125_456)).toBe("2:05.456");
    expect(formatClockMsPrecise(999)).toBe("0:00.999");
    expect(formatClockMsPrecise(0)).toBe("0:00.000");
  });
});
