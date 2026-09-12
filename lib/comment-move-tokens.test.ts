import { describe, expect, it } from "vitest";
import {
  aliasesForPlayedSan,
  colorForPlayedSanBody,
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
