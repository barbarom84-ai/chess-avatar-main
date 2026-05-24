import {
  getArenaIncrementMs,
  getArenaInitialMs,
} from "@/lib/arena-time-controls";
import type { PvpTimePreset } from "@/lib/pvp-time-controls";

export type PlayoffClockState = {
  whiteMs: number;
  blackMs: number;
  turnStartedAt: number;
  incrementMs: number;
};

export function createPlayoffClock(
  preset?: Pick<PvpTimePreset, "initialSec" | "incrementSec">
): PlayoffClockState {
  const initialMs = preset ? getArenaInitialMs(preset) : 180_000;
  const incrementMs = preset ? getArenaIncrementMs(preset) : 0;
  return {
    whiteMs: initialMs,
    blackMs: initialMs,
    turnStartedAt: Date.now(),
    incrementMs,
  };
}

export type PlayoffClockTickResult =
  | { kind: "ok"; clock: PlayoffClockState }
  | { kind: "timeout"; winner: "white" | "black"; clock: PlayoffClockState };

export function tickPlayoffClock(
  clock: PlayoffClockState,
  sideToMove: "w" | "b",
  nowMs = Date.now()
): PlayoffClockTickResult {
  const elapsed = Math.max(0, nowMs - clock.turnStartedAt);
  let whiteMs = clock.whiteMs;
  let blackMs = clock.blackMs;

  if (sideToMove === "w") {
    whiteMs = Math.max(0, whiteMs - elapsed);
    if (whiteMs <= 0) {
      return {
        kind: "timeout",
        winner: "black",
        clock: { ...clock, whiteMs: 0, blackMs, turnStartedAt: nowMs },
      };
    }
  } else {
    blackMs = Math.max(0, blackMs - elapsed);
    if (blackMs <= 0) {
      return {
        kind: "timeout",
        winner: "white",
        clock: { ...clock, whiteMs, blackMs: 0, turnStartedAt: nowMs },
      };
    }
  }

  return {
    kind: "ok",
    clock: { ...clock, whiteMs, blackMs, turnStartedAt: nowMs },
  };
}

export function commitPlayoffClockTurn(
  clock: PlayoffClockState,
  sideToMove: "w" | "b",
  nowMs = Date.now()
): PlayoffClockState {
  const elapsed = Math.max(0, nowMs - clock.turnStartedAt);
  if (sideToMove === "w") {
    return {
      ...clock,
      whiteMs: Math.max(0, clock.whiteMs - elapsed) + clock.incrementMs,
      turnStartedAt: nowMs,
    };
  }
  return {
    ...clock,
    blackMs: Math.max(0, clock.blackMs - elapsed) + clock.incrementMs,
    turnStartedAt: nowMs,
  };
}

export function switchPlayoffClockTurn(clock: PlayoffClockState): PlayoffClockState {
  return { ...clock, turnStartedAt: Date.now() };
}

export function getPlayoffClockDisplay(
  clock: PlayoffClockState,
  sideToMove: "w" | "b",
  nowMs = Date.now()
): { whiteMs: number; blackMs: number; active: "w" | "b" } {
  const elapsed = Math.max(0, nowMs - clock.turnStartedAt);
  if (sideToMove === "w") {
    return {
      whiteMs: Math.max(0, clock.whiteMs - elapsed),
      blackMs: clock.blackMs,
      active: "w",
    };
  }
  return {
    whiteMs: clock.whiteMs,
    blackMs: Math.max(0, clock.blackMs - elapsed),
    active: "b",
  };
}
