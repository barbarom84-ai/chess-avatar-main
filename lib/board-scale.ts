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
 * CSS max-width that tracks --board-scale even when the parent is narrower than
 * the absolute board max (otherwise min(100%, maxToken*scale) stays at 100%
 * for the whole 75–140% range).
 *
 * Formula: min(100%, 100%*scale, token*scale)
 */
export function scaledBoardMaxWidthExpr(maxTokenOrExpr: string): string {
  const expr = maxTokenOrExpr.trim();
  return `min(100%, calc(100% * var(--board-scale, 1)), calc((${expr}) * var(--board-scale, 1)))`;
}

/**
 * Apply `--board-scale` to a CSS max-width expression.
 * Fill values (`100%`) scale against the parent width so shrink/grow is visible.
 */
export function resolveScaledBoardMaxWidth(
  boardMaxWidth: string | undefined,
  opts: { hasClassName?: boolean; ignoreBoardScale?: boolean } = {}
): string | undefined {
  if (opts.ignoreBoardScale) return boardMaxWidth;

  if (boardMaxWidth) {
    const trimmed = boardMaxWidth.trim();
    // Fill parents that already apply --board-scale (chessboard-frame--*).
    // Scaling again here would square the factor.
    if (trimmed === "100%" || trimmed === "100cqw" || trimmed === "100cqh") {
      return trimmed;
    }
    return scaledBoardMaxWidthExpr(trimmed);
  }

  if (opts.hasClassName) return undefined;

  return scaledBoardMaxWidthExpr("var(--board-max-default)");
}
