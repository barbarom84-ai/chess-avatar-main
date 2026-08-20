import { describe, expect, it } from "vitest";
import { canAccessPvpGameAsSpectator, pvpRematchWantWhite } from "@/lib/pvp-access";

describe("canAccessPvpGameAsSpectator", () => {
  it("allows playing and finished games for non-participants", () => {
    expect(canAccessPvpGameAsSpectator("playing", false, false)).toBe(true);
    expect(canAccessPvpGameAsSpectator("finished", false, false)).toBe(true);
  });

  it("denies waiting lobbies and participants", () => {
    expect(canAccessPvpGameAsSpectator("waiting", false, true)).toBe(false);
    expect(canAccessPvpGameAsSpectator("playing", true, false)).toBe(false);
  });
});

describe("pvpRematchWantWhite", () => {
  it("swaps colors when requested", () => {
    expect(pvpRematchWantWhite(true, true)).toBe(false);
    expect(pvpRematchWantWhite(false, true)).toBe(true);
  });

  it("keeps same color when swap is off", () => {
    expect(pvpRematchWantWhite(true, false)).toBe(true);
    expect(pvpRematchWantWhite(false, false)).toBe(false);
  });
});
