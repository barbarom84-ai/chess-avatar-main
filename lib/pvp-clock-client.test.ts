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
    const moves: PvpMoveRow[] = [
      {
        id: 1,
        game_id: "g1",
        ply: 1,
        uci: "e2e4",
        played_by: "w",
        created_at: new Date(1_000_500).toISOString(),
        time_spent_ms: 20_000,
      },
    ];
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
    const moves: PvpMoveRow[] = [
      {
        id: 1,
        game_id: "g1",
        ply: 1,
        uci: "e2e4",
        played_by: "w",
        created_at: new Date(nowMs).toISOString(),
        time_spent_ms: 30_000,
      },
    ];
    const chessAfter = new Chess();
    chessAfter.move("e4");
    const desynced = getPvpClockDisplayMs(game, chessAfter.turn(), nowMs);
    expect(desynced.blackMs).toBeLessThan(60_000);

    const authority = chessForPvpClockAuthority(game, moves).turn();
    const fixed = getPvpClockDisplayMs(game, authority, nowMs);
    expect(fixed.blackMs).toBe(60_000);
    expect(fixed.whiteMs).toBe(30_000);

    expect(checkTimeoutForTimedGameWithMoves(game, moves, nowMs)).toBeNull();
  });
});

describe("optimisticGameClockAfterMove", () => {
  it("avoids black clock drop when move is applied before server game update", () => {
    const game = timedGame();
    const nowMs = 1_030_000;
    const movesBefore: never[] = [];
    const chessAfter = new Chess();
    chessAfter.move("e4");

    const patch = optimisticGameClockAfterMove(game, movesBefore, nowMs);
    const synced = getPvpClockDisplayMs(
      { ...game, ...patch },
      chessAfter.turn(),
      nowMs
    );
    expect(synced.blackMs).toBe(60_000);
    expect(synced.whiteMs).toBe(30_000);
  });
});
