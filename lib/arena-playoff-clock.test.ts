import { describe, expect, it } from "vitest";
import {
  commitPlayoffClockTurn,
  createPlayoffClock,
  getPlayoffClockDisplay,
  remainingPlayoffClockMs,
  switchPlayoffClockTurn,
  tickPlayoffClock,
} from "./arena-playoff-clock";

const base = { whiteMs: 60_000, blackMs: 60_000, turnStartedAt: 1_000, incrementMs: 2_000 };

describe("createPlayoffClock", () => {
  it("uses the preset initial time and increment", () => {
    const c = createPlayoffClock({ initialSec: 180, incrementSec: 2 });
    expect(c.whiteMs).toBe(180_000);
    expect(c.blackMs).toBe(180_000);
    expect(c.incrementMs).toBe(2_000);
  });

  it("defaults to 3 minutes without increment", () => {
    const c = createPlayoffClock();
    expect(c.whiteMs).toBe(180_000);
    expect(c.incrementMs).toBe(0);
  });
});

describe("tickPlayoffClock", () => {
  it("only consumes the side to move", () => {
    const r = tickPlayoffClock(base, "w", 11_000);
    expect(r.kind).toBe("ok");
    expect(r.clock.whiteMs).toBe(50_000);
    expect(r.clock.blackMs).toBe(60_000);
    expect(r.clock.turnStartedAt).toBe(11_000);
  });

  it("flags the side whose time runs out", () => {
    const r = tickPlayoffClock(base, "b", 70_000);
    expect(r).toMatchObject({ kind: "timeout", winner: "white" });
    expect(r.clock.blackMs).toBe(0);
  });
});

describe("commitPlayoffClockTurn", () => {
  it("charges elapsed time and adds the increment", () => {
    const c = commitPlayoffClockTurn(base, "w", 4_000);
    expect(c.whiteMs).toBe(60_000 - 3_000 + 2_000);
    expect(c.blackMs).toBe(60_000);
  });

  it("never goes below zero before the increment", () => {
    const c = commitPlayoffClockTurn(base, "b", 100_000);
    expect(c.blackMs).toBe(2_000);
  });
});

describe("display helpers", () => {
  it("counts down only the active side", () => {
    expect(getPlayoffClockDisplay(base, "b", 6_000)).toEqual({
      whiteMs: 60_000,
      blackMs: 55_000,
      active: "b",
    });
  });

  it("remainingPlayoffClockMs can go negative to signal a flag", () => {
    expect(remainingPlayoffClockMs(base, "w", 2_000)).toBe(59_000);
    expect(remainingPlayoffClockMs(base, "w", 100_000)).toBeLessThan(0);
  });

  it("switchPlayoffClockTurn restarts the turn timer", () => {
    expect(switchPlayoffClockTurn(base, 9_999).turnStartedAt).toBe(9_999);
  });
});
