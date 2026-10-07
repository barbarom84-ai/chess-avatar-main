/**
 * After a pointer tap is handled on pointerup, the browser still fires a synthetic click.
 * On touch screens it can arrive several frames later, so it must be matched by square and time,
 * not by "next animation frame". Clicks on other squares (the destination tap) are never swallowed.
 */
export const SYNTHETIC_CLICK_WINDOW_MS = 600;

export type PendingSyntheticClick = { square: string; until: number } | null;

export function expectSyntheticClick(square: string, nowMs: number): PendingSyntheticClick {
  return { square, until: nowMs + SYNTHETIC_CLICK_WINDOW_MS };
}

export function isSyntheticClick(
  pending: PendingSyntheticClick,
  square: string,
  nowMs: number
): boolean {
  return pending != null && pending.square === square && nowMs <= pending.until;
}
