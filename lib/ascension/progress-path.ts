/** Vertical space (px) between two consecutive puzzle nodes. */
export const NODE_SPACING_PX = 100;
const TOP_PADDING = 52;
const BOTTOM_PADDING = 52;

/** Total scrollable height for n puzzle nodes. */
export function ascensionContentHeight(count: number): number {
  if (count <= 1) return TOP_PADDING + BOTTOM_PADDING + NODE_SPACING_PX;
  return TOP_PADDING + (count - 1) * NODE_SPACING_PX + BOTTOM_PADDING;
}

/**
 * Generate puzzle node positions.
 * x = 0–100 (percent of container width)
 * y = px from top of scrollable content
 * Puzzle 0 is at the BOTTOM, last puzzle at the TOP.
 */
export function generateAscensionNodes(count: number): { x: number; y: number }[] {
  const height = ascensionContentHeight(count);
  const bottomY = height - BOTTOM_PADDING;
  const topY = TOP_PADDING;
  const step = count > 1 ? (bottomY - topY) / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => {
    const y = bottomY - i * step;
    const isLast = i === count - 1;
    const x = isLast ? 50 : i % 2 === 0 ? 72 : 28;
    return { x, y };
  });
}

/** Convert a node to absolute CSS position (left as %, top as px). */
export function pathNodeToStyle(node: { x: number; y: number }): {
  left: string;
  top: string;
} {
  return { left: `${node.x}%`, top: `${node.y}px` };
}

export function buildAscensionPathD(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export function firstOpenPuzzleIndex<T extends { completed: boolean }>(puzzles: T[]): number {
  const idx = puzzles.findIndex((p) => !p.completed);
  return idx >= 0 ? idx : Math.max(0, puzzles.length - 1);
}

/**
 * Returns the index of the first incomplete, unlocked standard puzzle.
 * Fantasy puzzles are ignored for main-path progress.
 */
export function firstOpenStandardPuzzleIndex<
  T extends { completed: boolean; kind: string; locked?: boolean },
>(allPuzzlesSorted: T[]): number {
  const standard = allPuzzlesSorted.filter((p) => p.kind === "standard");
  const unlockedIdx = standard.findIndex((p) => !p.completed && !p.locked);
  if (unlockedIdx >= 0) return unlockedIdx;
  const idx = standard.findIndex((p) => !p.completed);
  return idx >= 0 ? idx : Math.max(0, standard.length - 1);
}

/** Spacing constants exposed so the path component can use them for bonus nodes. */
export const BONUS_NODE_SPACING_PX = NODE_SPACING_PX;
export const BONUS_NODE_X = 84; // fixed % from left for the bonus column

// ---------------------------------------------------------------------------
// Legacy – keep ASCENSION_PATH_NODES / ASCENSION_PATH_VIEW_HEIGHT so any
// other file that still imports them doesn't break at build time.
// ---------------------------------------------------------------------------
export const ASCENSION_PATH_VIEW_HEIGHT = 420;
export const ASCENSION_PATH_NODES: { x: number; y: number }[] = generateAscensionNodes(40);
