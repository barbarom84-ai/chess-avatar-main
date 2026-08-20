import { describe, expect, it, vi } from "vitest";
import {
  adaptiveDepthForPly,
  createCachedGetBestMoveAndEval,
} from "./game-review";

describe("adaptiveDepthForPly", () => {
  it("uses full depth in opening", () => {
    expect(adaptiveDepthForPly(2, 80, 18, 0)).toBe(18);
  });

  it("lowers depth in quiet middlegame", () => {
    expect(adaptiveDepthForPly(20, 80, 18, 0.2)).toBe(14);
  });

  it("uses full depth after eval swing", () => {
    expect(adaptiveDepthForPly(20, 80, 18, 2)).toBe(18);
  });
});

describe("createCachedGetBestMoveAndEval", () => {
  it("reuses cached FEN results", async () => {
    const fn = vi.fn(async (fen: string) => ({
      move: "e2e4",
      evalPawns: fen.includes("w") ? 0.1 : -0.1,
    }));
    const cached = createCachedGetBestMoveAndEval(fn);
    await cached("fen-a", 14);
    await cached("fen-a", 14);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
