import { describe, expect, it } from "vitest";
import {
  SYNTHETIC_CLICK_WINDOW_MS,
  expectSyntheticClick,
  isSyntheticClick,
} from "@/lib/board-synthetic-click";

describe("synthetic click after a handled tap", () => {
  const t0 = 1_000;

  it("swallows a late click on the tapped square (touch screens fire it frames later)", () => {
    const pending = expectSyntheticClick("e2", t0);
    expect(isSyntheticClick(pending, "e2", t0 + 35)).toBe(true);
  });

  it("lets a quick tap on the destination square through", () => {
    const pending = expectSyntheticClick("e2", t0);
    expect(isSyntheticClick(pending, "e4", t0 + 120)).toBe(false);
  });

  it("expires so a later real click is handled", () => {
    const pending = expectSyntheticClick("e2", t0);
    expect(isSyntheticClick(pending, "e2", t0 + SYNTHETIC_CLICK_WINDOW_MS + 1)).toBe(false);
  });

  it("does nothing without a handled tap", () => {
    expect(isSyntheticClick(null, "e2", t0)).toBe(false);
  });
});
