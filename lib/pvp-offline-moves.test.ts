import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getPendingPvpMoves,
  enqueuePendingPvpMove,
  clearPendingPvpMoves,
} from "@/lib/pvp-offline-moves";

const store = new Map<string, string>();

describe("pvp-offline-moves", () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    });
  });

  it("queues and retrieves pending moves", () => {
    enqueuePendingPvpMove("game-1", "e2e4");
    enqueuePendingPvpMove("game-1", "g1f3");
    const moves = getPendingPvpMoves("game-1");
    expect(moves).toHaveLength(2);
    expect(moves[0].uci).toBe("e2e4");
  });

  it("clears moves for a game", () => {
    enqueuePendingPvpMove("game-1", "e2e4");
    enqueuePendingPvpMove("game-2", "d2d4");
    clearPendingPvpMoves("game-1");
    expect(getPendingPvpMoves("game-1")).toHaveLength(0);
    expect(getPendingPvpMoves("game-2")).toHaveLength(1);
  });
});

describe("isBrowserOnline", () => {
  it("returns true when navigator.onLine is unavailable", async () => {
    const { isBrowserOnline } = await import("@/lib/offline-sync");
    expect(isBrowserOnline()).toBe(true);
  });
});

describe("heatIntensity", () => {
  it("normalizes values", async () => {
    const { heatIntensity } = await import("@/lib/persona-move-analysis");
    expect(heatIntensity(5, 10)).toBe(50);
  });
});
