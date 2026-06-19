import { describe, expect, it } from "vitest";
import { pvpActiveGameIsMyTurn } from "@/lib/pvp-active-games";

describe("pvpActiveGameIsMyTurn", () => {
  it("white to move on even move counts", () => {
    expect(pvpActiveGameIsMyTurn("white", 0)).toBe(true);
    expect(pvpActiveGameIsMyTurn("white", 2)).toBe(true);
    expect(pvpActiveGameIsMyTurn("white", 1)).toBe(false);
  });

  it("black to move on odd move counts", () => {
    expect(pvpActiveGameIsMyTurn("black", 1)).toBe(true);
    expect(pvpActiveGameIsMyTurn("black", 3)).toBe(true);
    expect(pvpActiveGameIsMyTurn("black", 0)).toBe(false);
  });
});
