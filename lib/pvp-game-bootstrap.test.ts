import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  clearPvpGameBootstrap,
  consumePvpGameBootstrap,
  readPvpGameBootstrap,
  writePvpGameBootstrap,
  type PvpGameBootstrap,
} from "@/lib/pvp-game-bootstrap";
import type { PvpGameRow } from "@/lib/pvp-chess";

const gameId = "game-1";

function minimalGame(overrides: Partial<PvpGameRow> = {}): PvpGameRow {
  return {
    id: gameId,
    status: "playing",
    white_user_id: "w1",
    black_user_id: "b1",
    time_preset: "blitz5",
    clock_mode: "timed",
    white_remaining_ms: 300_000,
    black_remaining_ms: 300_000,
    clock_turn_started_at: new Date().toISOString(),
    ...overrides,
  } as PvpGameRow;
}

function seed(overrides: Partial<PvpGameBootstrap> = {}): PvpGameBootstrap {
  return {
    gameId,
    game: minimalGame(),
    role: "black",
    moves: [],
    at: Date.now(),
    ...overrides,
  };
}

describe("pvp-game-bootstrap", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });
    clearPvpGameBootstrap();
  });

  it("writes and reads bootstrap for matching game id", () => {
    writePvpGameBootstrap(seed());
    expect(readPvpGameBootstrap(gameId)?.role).toBe("black");
    expect(readPvpGameBootstrap("other")).toBeNull();
  });

  it("consume clears storage", () => {
    writePvpGameBootstrap(seed());
    const consumed = consumePvpGameBootstrap(gameId);
    expect(consumed?.gameId).toBe(gameId);
    expect(readPvpGameBootstrap(gameId)).toBeNull();
  });

  it("rejects expired bootstrap", () => {
    writePvpGameBootstrap(seed({ at: Date.now() - 121_000 }));
    expect(readPvpGameBootstrap(gameId)).toBeNull();
  });
});
