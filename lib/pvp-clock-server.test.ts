import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import type { PvpGameRow } from "@/lib/pvp-chess";
import {
  applyMoveClockUpdate,
  checkTimeoutForTimedGame,
  finalClockPatch,
  lagCompensationMs,
  PVP_FIRST_MOVE_ABORT_MS,
  PVP_LAG_COMPENSATION_MAX_MS,
  takebackClockUpdate,
} from "@/lib/pvp-clock-server";

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

describe("correspondence display helpers", () => {
  it("does not flag low time at start of 1-day move", async () => {
    const { isCorrespondenceTimeLow } = await import("@/lib/pvp-clock");
    const oneDay = 86_400 * 1000;
    expect(isCorrespondenceTimeLow(oneDay, oneDay)).toBe(false);
    expect(isCorrespondenceTimeLow(oneDay * 0.5, oneDay)).toBe(false);
  });

  it("flags low time in final fraction of move budget", async () => {
    const { isCorrespondenceTimeLow } = await import("@/lib/pvp-clock");
    const oneDay = 86_400 * 1000;
    expect(isCorrespondenceTimeLow(oneDay * 0.05, oneDay)).toBe(true);
  });
});

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

const T0 = 1_000_000;

function blitz(overrides: Partial<PvpGameRow> = {}): PvpGameRow {
  return correspondenceGame({
    clock_mode: "timed",
    clock_initial_sec: 180,
    clock_increment_sec: 2,
    time_preset: "blitz_3_2",
    white_remaining_ms: 60_000,
    black_remaining_ms: 60_000,
    clock_turn_started_at: new Date(T0).toISOString(),
    ...overrides,
  });
}

function afterPlies(...sans: string[]): Chess {
  const chess = new Chess();
  for (const san of sans) chess.move(san);
  return chess;
}

describe("live clock start", () => {
  it("charges neither side for its first move, without increment", () => {
    for (const chess of [afterPlies(), afterPlies("e4")]) {
      const tick = applyMoveClockUpdate(blitz(), chess, T0 + 20_000);
      expect(tick.kind).toBe("tick");
      if (tick.kind === "tick") {
        expect(tick.white_remaining_ms).toBe(60_000);
        expect(tick.black_remaining_ms).toBe(60_000);
      }
    }
  });

  it("runs the clock from the third ply on", () => {
    const tick = applyMoveClockUpdate(blitz(), afterPlies("e4", "e5"), T0 + 20_000);
    expect(tick.kind === "tick" && tick.white_remaining_ms).toBe(42_000);
  });

  it("aborts a game whose side to move skips its first move", () => {
    expect(checkTimeoutForTimedGame(blitz(), afterPlies("e4"), T0 + 29_000)).toBeNull();
    const patch = checkTimeoutForTimedGame(blitz(), afterPlies("e4"), T0 + PVP_FIRST_MOVE_ABORT_MS);
    expect(patch?.status).toBe("aborted");
    expect(patch?.result).toBe("*");
    expect(patch?.result_reason).toBe("no_first_move");
    const late = applyMoveClockUpdate(blitz(), afterPlies(), T0 + 31_000);
    expect(late.kind === "timeout" && late.patch.status).toBe("aborted");
  });
});

describe("lag compensation", () => {
  it("refunds the delay between the server clock and the client's thinking time, capped", () => {
    expect(lagCompensationMs(5_000, 4_300)).toBe(700);
    expect(lagCompensationMs(5_000, 0)).toBe(PVP_LAG_COMPENSATION_MAX_MS);
    expect(lagCompensationMs(5_000, 6_000)).toBe(0);
    expect(lagCompensationMs(5_000, undefined)).toBe(0);
    expect(lagCompensationMs(5_000, "12")).toBe(0);
    expect(lagCompensationMs(5_000, -1)).toBe(0);
  });

  it("is refunded from the mover's elapsed time", () => {
    const tick = applyMoveClockUpdate(blitz(), afterPlies("e4", "e5"), T0 + 10_000, 800);
    expect(tick.kind === "tick" && tick.white_remaining_ms).toBe(60_000 - 9_200 + 2_000);
  });
});

describe("clocks when a game ends or a move is taken back", () => {
  it("freezes the side to move's clock at resignation time", () => {
    const patch = finalClockPatch(blitz(), afterPlies("e4", "e5", "Nf3"), T0 + 7_000);
    expect(patch.white_remaining_ms).toBe(60_000);
    expect(patch.black_remaining_ms).toBe(53_000);
  });

  it("charges the waiting side and takes back the undone move's increment", () => {
    // White played Nf3 (+2 s); Black waited 9 s on the takeback request.
    const res = takebackClockUpdate(blitz(), afterPlies("e4", "e5", "Nf3"), T0 + 9_000);
    expect(res.kind).toBe("ok");
    if (res.kind === "ok") {
      expect(res.patch.black_remaining_ms).toBe(51_000);
      expect(res.patch.white_remaining_ms).toBe(58_000);
      expect(res.patch.clock_turn_started_at).toBe(new Date(T0 + 9_000).toISOString());
    }
  });

  it("gives no increment back for a first move, which earned none", () => {
    const res = takebackClockUpdate(blitz(), afterPlies("e4"), T0 + 9_000);
    expect(res.kind === "ok" && res.patch.white_remaining_ms).toBe(60_000);
    expect(res.kind === "ok" && res.patch.black_remaining_ms).toBe(60_000);
  });

  it("ends the game on time instead when the waiting side has flagged", () => {
    const res = takebackClockUpdate(blitz({ black_remaining_ms: 5_000 }), afterPlies("e4", "e5", "Nf3"), T0 + 9_000);
    expect(res.kind === "timeout" && res.patch.result).toBe("1-0");
  });
});
