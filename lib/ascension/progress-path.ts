export const ASCENSION_PATH_VIEW_HEIGHT = 420;

export const ASCENSION_PATH_NODES: { x: number; y: number }[] = [
  { x: 72, y: 380 },
  { x: 28, y: 340 },
  { x: 72, y: 300 },
  { x: 28, y: 260 },
  { x: 72, y: 220 },
  { x: 28, y: 180 },
  { x: 72, y: 140 },
  { x: 28, y: 100 },
  { x: 50, y: 55 },
];

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

export function pathNodeToStyle(node: { x: number; y: number }): { left: string; top: string } {
  return {
    left: `${node.x}%`,
    top: `${(node.y / ASCENSION_PATH_VIEW_HEIGHT) * 100}%`,
  };
}

export function firstOpenPuzzleIndex<T extends { completed: boolean }>(puzzles: T[]): number {
  const idx = puzzles.findIndex((p) => !p.completed);
  return idx >= 0 ? idx : Math.max(0, puzzles.length - 1);
}
