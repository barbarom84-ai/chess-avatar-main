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

/** One puzzle per (track, sort_order) for the player campaign path. */
export function dedupeCampaignPuzzlesByLevel(puzzles: PuzzleRow[]): PuzzleRow[] {
  const levels = new Map<string, PuzzleRow>();
  for (const puzzle of puzzles) {
    const key = `${puzzle.track}:${puzzle.sort_order}`;
    const existing = levels.get(key);
    if (!existing) {
      levels.set(key, puzzle);
      continue;
    }
    const candidates = [existing, puzzle];
    const published = candidates.filter((p) => p.is_published);
    const pool = published.length > 0 ? published : candidates;
    const best = [...pool].sort((a, b) => puzzleRecency(b) - puzzleRecency(a))[0]!;
    levels.set(key, best);
  }
  return [...levels.values()].sort((a, b) => a.sort_order - b.sort_order);
}

type PuzzleWithCompletion = DbCampaignPuzzle & { completed: boolean };

/**
 * Main-track standard puzzles are unlocked sequentially by sort_order.
 * The first standard puzzle is always unlocked; each next one requires
 * the previous standard (by sort_order) to be completed.
 */
export function computeStandardPuzzleLocked(
  puzzles: PuzzleWithCompletion[]
): Map<string, boolean> {
  const standards = [...puzzles]
    .filter((p) => p.track === "main" && p.kind === "standard")
    .sort((a, b) => a.sort_order - b.sort_order);

  const locked = new Map<string, boolean>();
  for (let i = 0; i < standards.length; i++) {
    const puzzle = standards[i]!;
    if (i === 0) {
      locked.set(puzzle.id, false);
      continue;
    }
    const prev = standards[i - 1]!;
    locked.set(puzzle.id, !prev.completed);
  }
  return locked;
}

/**
 * The Fantasy track is a separate sequential campaign that only opens once the
 * track is unlocked (3000 ELO reached, or the main campaign completed). While
 * locked, every puzzle in the track is locked; once unlocked it unlocks step by
 * step like the main track.
 */
export function computeFantasyTrackLocked(
  puzzles: PuzzleWithCompletion[],
  trackUnlocked: boolean
): Map<string, boolean> {
  const fantasy = [...puzzles]
    .filter((p) => p.track === "fantasy")
    .sort((a, b) => a.sort_order - b.sort_order);

  const locked = new Map<string, boolean>();
  for (let i = 0; i < fantasy.length; i++) {
    const puzzle = fantasy[i]!;
    if (!trackUnlocked) {
      locked.set(puzzle.id, true);
      continue;
    }
    if (i === 0) {
      locked.set(puzzle.id, false);
      continue;
    }
    const prev = fantasy[i - 1]!;
    locked.set(puzzle.id, !prev.completed);
  }
  return locked;
}

/** The main campaign is "complete" when every published main-track standard puzzle is solved. */
export function isMainCampaignComplete(puzzles: PuzzleWithCompletion[]): boolean {
  const mainStandards = puzzles.filter(
    (p) => p.track === "main" && p.kind === "standard"
  );
  if (mainStandards.length === 0) return false;
  return mainStandards.every((p) => p.completed);
}

const FANTASY_TRACK_ELO_GATE = 3000;

/** Recompute sequential lock flags after a local completion update. */
export function applyPuzzleLocks<T extends DbCampaignPuzzle & { completed: boolean; locked: boolean }>(
  puzzles: T[],
  playerElo: number
): T[] {
  const mainComplete = isMainCampaignComplete(puzzles);
  const fantasyTrackUnlocked = playerElo >= FANTASY_TRACK_ELO_GATE || mainComplete;
  const standardLocked = computeStandardPuzzleLocked(puzzles);
  const fantasyLocked = computeFantasyTrackLocked(puzzles, fantasyTrackUnlocked);

  return puzzles.map((p) => {
    let locked = false;
    if (p.track === "fantasy") {
      locked = fantasyLocked.get(p.id) ?? true;
    } else if (p.kind === "standard") {
      locked = standardLocked.get(p.id) ?? false;
    }
    return { ...p, locked };
  });
}
