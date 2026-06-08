import { describe, expect, it, vi } from "vitest";
import { loadNnueWithCache } from "./nnue-idb-cache";

describe("loadNnueWithCache", () => {
  it("fetches from network when IndexedDB is unavailable", async () => {
    const payload = new Uint8Array([0x4e, 0x4e, 0x55, 0x45]);
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => payload.buffer,
    });

    const bytes = await loadNnueWithCache("/chessavatar/nn-default.nnue", fetchImpl);

    expect(bytes).toEqual(payload);
    expect(fetchImpl).toHaveBeenCalledWith("/chessavatar/nn-default.nnue");
  });

  it("throws when fetch fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(
      loadNnueWithCache("/missing.nnue", fetchImpl)
    ).rejects.toThrow("NNUE fetch failed: 404");
  });
});

describe("parseChessAvatarMultiPvLine", () => {
  it("extracts first PV move by multipv index", async () => {
    const { parseChessAvatarMultiPvLine } = await import("./chessavatar-client");
    const lines = new Map<number, string>();
    parseChessAvatarMultiPvLine(
      "info depth 12 score cp 34 nodes 1000 nps 50000 time 20 hashfull 0 multipv 2 pv e2e4 e7e5",
      lines
    );
    expect(lines.get(2)).toBe("e2e4");
  });
});

describe("webSearchLimits", () => {
  it("caps depth and extends movetime for strong bots", async () => {
    const { webSearchLimits } = await import("./chessavatar-client");
    const limits = webSearchLimits(30, 500, 3, 3200);
    expect(limits.depth).toBeLessThanOrEqual(22);
    expect(limits.movetime).toBeGreaterThanOrEqual(18_000);
  });

  it("uses shorter movetime for low difficulty", async () => {
    const { webSearchLimits } = await import("./chessavatar-client");
    const limits = webSearchLimits(12, 500, 2);
    expect(limits.movetime).toBeGreaterThanOrEqual(200);
    expect(limits.movetime).toBeLessThan(1200);
  });
});
