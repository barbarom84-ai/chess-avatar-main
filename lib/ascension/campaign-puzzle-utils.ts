import type { DbCampaignPuzzle } from "@/lib/ascension/types";

type PuzzleRow = DbCampaignPuzzle & { updated_at?: string };

function puzzleRecency(p: PuzzleRow): number {
  if (p.updated_at) {
    const t = Date.parse(p.updated_at);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

/** Pick the canonical puzzle for a campaign level (published + most recently updated). */
export function canonicalPuzzleAtLevel(
  puzzles: PuzzleRow[],
  level: number
): PuzzleRow | undefined {
  const atLevel = puzzles.filter((p) => p.sort_order === level);
  if (atLevel.length === 0) return undefined;

  const published = atLevel.filter((p) => p.is_published);
  const pool = published.length > 0 ? published : atLevel;
  return [...pool].sort((a, b) => puzzleRecency(b) - puzzleRecency(a))[0];
}

/** One puzzle per sort_order for the player campaign path. */
export function dedupeCampaignPuzzlesByLevel(puzzles: PuzzleRow[]): PuzzleRow[] {
  const levels = new Map<number, PuzzleRow>();
  for (const puzzle of puzzles) {
    const existing = levels.get(puzzle.sort_order);
    if (!existing) {
      levels.set(puzzle.sort_order, puzzle);
      continue;
    }
    const candidates = [existing, puzzle];
    const published = candidates.filter((p) => p.is_published);
    const pool = published.length > 0 ? published : candidates;
    const best = [...pool].sort((a, b) => puzzleRecency(b) - puzzleRecency(a))[0]!;
    levels.set(puzzle.sort_order, best);
  }
  return [...levels.values()].sort((a, b) => a.sort_order - b.sort_order);
}
