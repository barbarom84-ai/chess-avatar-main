import { describe, expect, it } from "vitest";
import {
  aliasesForPlayedSan,
  colorForPlayedSanBody,
  colorForSanOnBoard,
} from "@/lib/comment-move-tokens";

describe("aliasesForPlayedSan", () => {
  it("treats Qxg7 and Dxg7 as the same played queen move", () => {
    const aliases = new Set(aliasesForPlayedSan("Qxg7"));
    expect(aliases.has("Qxg7")).toBe(true);
    expect(aliases.has("Dxg7")).toBe(true);
    expect(aliases.has("Qg7")).toBe(true);
    expect(aliases.has("Dg7")).toBe(true);
  });
});

describe("colorForPlayedSanBody", () => {
  it("paints the last move with the side that played it, not the side to move", () => {
    const aliases = new Set(aliasesForPlayedSan("Qxg7"));
    expect(colorForPlayedSanBody("Dxg7", "w", aliases, "b")).toBe("b");
    expect(colorForPlayedSanBody("Qxg7+", "w", aliases, "b")).toBe("b");
    expect(colorForPlayedSanBody("c5", "w", aliases, "b")).toBe("w");
  });
});

describe("colorForSanOnBoard", () => {
  const start =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const afterE4 =
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

  it("colors a move legal before the ply with the side that played, ignoring the default", () => {
    expect(
      colorForSanOnBoard("Cf3", "n", { fenBefore: start, fen: afterE4 }, "b")
    ).toBe("w");
    expect(
      colorForSanOnBoard(
        "Fxf5",
        "b",
        {
          fenBefore: "8/8/8/5p2/8/8/2B5/4K2k w - - 0 1",
          fen: "8/8/8/5B2/8/8/8/4K2k b - - 0 1",
        },
        "b"
      )
    ).toBe("w");
  });

  it("colors a continuation legal only on the displayed board with the side to move", () => {
    expect(
      colorForSanOnBoard("e5", "p", { fenBefore: start, fen: afterE4 }, "w")
    ).toBe("b");
  });

  it("reads the color of a piece already standing on the cited square", () => {
    expect(
      colorForSanOnBoard(
        "Ce2",
        "n",
        { fenBefore: "4k3/8/8/8/8/8/4N3/4K3 w - - 0 1" },
        "b"
      )
    ).toBe("w");
    expect(
      colorForSanOnBoard(
        "Ce2",
        "n",
        { fen: "4k3/8/8/8/8/8/4n3/4K3 b - - 0 1" },
        "w"
      )
    ).toBe("b");
  });
});
