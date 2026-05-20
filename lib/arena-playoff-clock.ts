import { PLAYOFF_INITIAL_MS } from "@/lib/arena-chess";

export type PlayoffClockState = {
  whiteMs: number;
  blackMs: number;
  turnStartedAt: number;
};

export function createPlayoffClock(
  initialMs = PLAYOFF_INITIAL_MS
): PlayoffClockState {
  return {
    whiteMs: initialMs,
    blackMs: initialMs,
    turnStartedAt: Date.now(),
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
        clock: { whiteMs: 0, blackMs, turnStartedAt: nowMs },
      };
    }
  } else {
    blackMs = Math.max(0, blackMs - elapsed);
    if (blackMs <= 0) {
      return {
        kind: "timeout",
        winner: "white",
        clock: { whiteMs, blackMs: 0, turnStartedAt: nowMs },
      };
    }
  }

  return {
    kind: "ok",
    clock: { whiteMs, blackMs, turnStartedAt: nowMs },
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
      whiteMs: Math.max(0, clock.whiteMs - elapsed),
      blackMs: clock.blackMs,
      turnStartedAt: nowMs,
    };
  }
  return {
    whiteMs: clock.whiteMs,
    blackMs: Math.max(0, clock.blackMs - elapsed),
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
