import { describe, expect, it } from "vitest";
import {
  BOARD_SCALE_DEFAULT_PERCENT,
  BOARD_SCALE_MAX_PERCENT,
  BOARD_SCALE_MIN_PERCENT,
  boardScaleCssVar,
  clampBoardScalePercent,
  resolveScaledBoardMaxWidth,
} from "./board-scale";

describe("clampBoardScalePercent", () => {
  it("clamps to the allowed range", () => {
    expect(clampBoardScalePercent(50)).toBe(BOARD_SCALE_MIN_PERCENT);
    expect(clampBoardScalePercent(200)).toBe(BOARD_SCALE_MAX_PERCENT);
    expect(clampBoardScalePercent(115)).toBe(115);
  });

  it("falls back for invalid values", () => {
    expect(clampBoardScalePercent(undefined)).toBe(BOARD_SCALE_DEFAULT_PERCENT);
    expect(clampBoardScalePercent("120" as unknown as number)).toBe(
      BOARD_SCALE_DEFAULT_PERCENT
    );
  });
});

describe("boardScaleCssVar", () => {
  it("converts percent to a CSS multiplier", () => {
    expect(boardScaleCssVar(100)).toBe("1");
    expect(boardScaleCssVar(125)).toBe("1.25");
    expect(boardScaleCssVar(75)).toBe("0.75");
  });
});

describe("resolveScaledBoardMaxWidth", () => {
  it("scales explicit layout formulas", () => {
    expect(resolveScaledBoardMaxWidth("min(96vw, 84vh, 820px)")).toBe(
      "min(100%, calc((min(96vw, 84vh, 820px)) * var(--board-scale, 1)))"
    );
  });

  it("does not double-scale fill values", () => {
    expect(resolveScaledBoardMaxWidth("100%")).toBe("100%");
    expect(resolveScaledBoardMaxWidth("100cqw")).toBe("100cqw");
  });

  it("respects ignoreBoardScale and className-only wrappers", () => {
    expect(
      resolveScaledBoardMaxWidth("8.25rem", { ignoreBoardScale: true })
    ).toBe("8.25rem");
    expect(resolveScaledBoardMaxWidth(undefined, { hasClassName: true })).toBeUndefined();
  });

  it("uses the default CSS token when no override is provided", () => {
    expect(resolveScaledBoardMaxWidth(undefined)).toBe(
      "min(100%, calc(var(--board-max-default) * var(--board-scale, 1)))"
    );
  });
});
