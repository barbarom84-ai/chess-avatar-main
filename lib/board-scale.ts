/** Global board size preference: 75%–140% of the layout-aware base size. */
export const BOARD_SCALE_MIN_PERCENT = 75;
export const BOARD_SCALE_MAX_PERCENT = 140;
export const BOARD_SCALE_DEFAULT_PERCENT = 100;

export function clampBoardScalePercent(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return BOARD_SCALE_DEFAULT_PERCENT;
  }
  return Math.min(
    BOARD_SCALE_MAX_PERCENT,
    Math.max(BOARD_SCALE_MIN_PERCENT, Math.round(value))
  );
}

export function boardScaleCssVar(percent: number): string {
  return String(clampBoardScalePercent(percent) / 100);
}

/**
 * Apply `--board-scale` to a CSS max-width expression.
 * Pass-through for fill values (`100%`) so parent frames are not double-scaled.
 */
export function resolveScaledBoardMaxWidth(
  boardMaxWidth: string | undefined,
  opts: { hasClassName?: boolean; ignoreBoardScale?: boolean } = {}
): string | undefined {
  if (opts.ignoreBoardScale) return boardMaxWidth;

  if (boardMaxWidth) {
    const trimmed = boardMaxWidth.trim();
    if (trimmed === "100%" || trimmed === "100cqw" || trimmed === "100cqh") {
      return trimmed;
    }
    return `min(100%, calc((${trimmed}) * var(--board-scale, 1)))`;
  }

  if (opts.hasClassName) return undefined;

  return "min(100%, calc(var(--board-max-default) * var(--board-scale, 1)))";
}
