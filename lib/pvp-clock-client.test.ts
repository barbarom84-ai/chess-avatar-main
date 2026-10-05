import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import { getPvpClockDisplayMs } from "@/lib/pvp-clock";
import { checkTimeoutForTimedGameWithMoves } from "@/lib/pvp-clock-server";
import {
  chessForPvpClockAuthority,
  isPvpClockBehindMoves,
} from "@/lib/pvp-clock-sync";
import { optimisticGameClockAfterMove } from "@/lib/pvp-clock-client";

function timedGame(partial: Partial<PvpGameRow> = {}): PvpGameRow {
  return {
    id: "g1",
    status: "playing",
    clock_mode: "timed",
    clock_initial_sec: 180,
    clock_increment_sec: 0,
    white_remaining_ms: 60_000,
    black_remaining_ms: 60_000,
    clock_turn_started_at: new Date(1_000_000).toISOString(),
    white_user_id: "w",
    black_user_id: "b",
    created_by: "w",
    time_preset: "blitz_3_0",
    draw_offered_by: null,
    takeback_offered_by: null,
    result: null,
    result_reason: null,
    ...partial,
  } as PvpGameRow;
}

/** 1. e4 e5 — the clocks only run once both sides have moved. */
const OPENING: PvpMoveRow[] = [
  { id: 1, game_id: "g1", ply: 1, uci: "e2e4", played_by: "w", created_at: new Date(990_000).toISOString() },
  { id: 2, game_id: "g1", ply: 2, uci: "e7e5", played_by: "b", created_at: new Date(995_000).toISOString() },
] as PvpMoveRow[];

function nf3(createdAtMs: number, timeSpentMs: number): PvpMoveRow {
  return {
    id: 3,
    game_id: "g1",
    ply: 3,
    uci: "g1f3",
    played_by: "w",
    created_at: new Date(createdAtMs).toISOString(),
    time_spent_ms: timeSpentMs,
  } as PvpMoveRow;
}

describe("pvp clock sync", () => {
  it("detects clock behind last move", () => {
    const game = timedGame();
    const moves: PvpMoveRow[] = [
      {
        id: 1,
        game_id: "g1",
        ply: 1,
        uci: "e2e4",
        played_by: "w",
        created_at: new Date(1_030_000).toISOString(),
        time_spent_ms: 30_000,
      },
    ];
    expect(isPvpClockBehindMoves(game, moves)).toBe(true);
    expect(chessForPvpClockAuthority(game, moves).turn()).toBe("w");
  });

  it("trusts a clock written just before a slow move insert", () => {
    // The move route writes the clock, then inserts the move up to ~700 ms later.
    const game = timedGame();
    const moves: PvpMoveRow[] = [
      {
        id: 1,
        game_id: "g1",
        ply: 1,
        uci: "e2e4",
        played_by: "w",
        created_at: new Date(1_000_681).toISOString(),
        time_spent_ms: 20_000,
      },
    ];
    expect(isPvpClockBehindMoves(game, moves)).toBe(false);
    expect(chessForPvpClockAuthority(game, moves).turn()).toBe("b");
  });

  it("never flags the player who just moved while the opponent thinks", () => {
    // White moved with 5 s left; Black then thinks 10 s. Only Black's clock may run.
    const game = timedGame({ white_remaining_ms: 5_000, black_remaining_ms: 60_000 });
    const moves = [...OPENING, nf3(1_000_500, 20_000)];
    expect(checkTimeoutForTimedGameWithMoves(game, moves, 1_010_000)).toBeNull();
    expect(checkTimeoutForTimedGameWithMoves(game, moves, 1_061_000)?.result).toBe("1-0");
  });

  it("trusts the clock when the move time is unknown or too short to judge", () => {
    const game = timedGame();
    const base = { id: 1, game_id: "g1", ply: 1, uci: "e2e4", played_by: "w" };
    const late = new Date(1_030_000).toISOString();
    expect(isPvpClockBehindMoves(game, [{ ...base, created_at: late } as PvpMoveRow])).toBe(false);
    expect(
      isPvpClockBehindMoves(game, [{ ...base, created_at: late, time_spent_ms: 400 } as PvpMoveRow])
    ).toBe(false);
  });

  it("does not flag opponent timeout while clock is behind moves", () => {
    const game = timedGame();
    const nowMs = 1_030_000;
    const moves = [...OPENING, nf3(nowMs, 30_000)];
    const chessAfter = new Chess();
    chessAfter.move("e4");
    chessAfter.move("e5");
    chessAfter.move("Nf3");
    const desynced = getPvpClockDisplayMs(game, chessAfter.turn(), nowMs, 3);
    expect(desynced.blackMs).toBeLessThan(60_000);

    const authority = chessForPvpClockAuthority(game, moves);
    const fixed = getPvpClockDisplayMs(game, authority.turn(), nowMs, authority.history().length);
    expect(fixed.blackMs).toBe(60_000);
    expect(fixed.whiteMs).toBe(30_000);

    expect(checkTimeoutForTimedGameWithMoves(game, moves, nowMs)).toBeNull();
  });

  it("keeps a live clock still until the side to move has played its first move", () => {
    const game = timedGame();
    const display = getPvpClockDisplayMs(game, "w", 1_020_000, 0);
    expect(display.whiteMs).toBe(60_000);
    expect(display.active).toBe("w");
  });
});

describe("optimisticGameClockAfterMove", () => {
  it("avoids black clock drop when move is applied before server game update", () => {
    const game = timedGame();
    const nowMs = 1_030_000;
    const chessAfter = new Chess();
    chessAfter.move("e4");
    chessAfter.move("e5");
    chessAfter.move("Nf3");

    const patch = optimisticGameClockAfterMove(game, OPENING, nowMs);
    const synced = getPvpClockDisplayMs({ ...game, ...patch }, chessAfter.turn(), nowMs, 3);
    expect(synced.blackMs).toBe(60_000);
    expect(synced.whiteMs).toBe(30_000);
  });

  it("charges nothing for a side's first move", () => {
    const patch = optimisticGameClockAfterMove(timedGame(), [], 1_020_000);
    expect(patch.white_remaining_ms).toBe(60_000);
    expect(patch.black_remaining_ms).toBe(60_000);
  });
});
