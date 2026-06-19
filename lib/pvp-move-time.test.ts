import { describe, expect, it } from "vitest";
import {
  computeMoveTimeSpentMs,
  formatPvpMoveListTimeMs,
  pvpMoveTimeMsByPly,
} from "@/lib/pvp-move-time";
import type { PvpMoveRow } from "@/lib/pvp-chess";

describe("computeMoveTimeSpentMs", () => {
  it("measures elapsed since clock turn start", () => {
    const started = new Date("2026-06-14T12:00:00.000Z").toISOString();
    const now = new Date("2026-06-14T12:00:03.456Z").getTime();
    expect(computeMoveTimeSpentMs(started, now)).toBe(3456);
  });
});

describe("formatPvpMoveListTimeMs", () => {
  it("formats sub-10s with one decimal", () => {
    expect(formatPvpMoveListTimeMs(3200, "timed", "en")).toBe("3.2s");
  });

  it("formats minutes as M:SS", () => {
    expect(formatPvpMoveListTimeMs(65_000, "timed", "en")).toBe("1:05");
  });

  it("hides zero for unlimited games", () => {
    expect(formatPvpMoveListTimeMs(0, "unlimited", "en")).toBe("");
  });
});

describe("pvpMoveTimeMsByPly", () => {
  it("prefers stored time_spent_ms", () => {
    const moves: PvpMoveRow[] = [
      {
        id: 1,
        game_id: "g",
        ply: 1,
        uci: "e2e4",
        played_by: "u1",
        created_at: "2026-06-14T12:00:01.000Z",
        time_spent_ms: 2500,
      },
    ];
    expect(pvpMoveTimeMsByPly(moves, "timed").get(1)).toBe(2500);
  });

  it("falls back to created_at delta", () => {
    const moves: PvpMoveRow[] = [
      {
        id: 1,
        game_id: "g",
        ply: 1,
        uci: "e2e4",
        played_by: "u1",
        created_at: "2026-06-14T12:00:01.000Z",
      },
      {
        id: 2,
        game_id: "g",
        ply: 2,
        uci: "e7e5",
        played_by: "u2",
        created_at: "2026-06-14T12:00:04.000Z",
      },
    ];
    expect(pvpMoveTimeMsByPly(moves, "timed").get(2)).toBe(3000);
  });
});
