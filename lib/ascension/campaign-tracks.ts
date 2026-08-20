import type { DbCampaignPuzzle, LocalizedText } from "@/lib/ascension/types";
import { ASCENSION_FREE_PUZZLES_PER_TRACK } from "@/lib/ascension/constants";
import { isMainCampaignComplete } from "@/lib/ascension/campaign-puzzle-utils";

export type CampaignTrackLayout = "main" | "sequential";

export type CampaignTrackUnlockRule =
  | { type: "always" }
  | { type: "main_complete_or_elo"; min_elo: number }
  | { type: "prerequisite_track"; track: string; require_complete?: boolean };

export interface DbCampaignTrack {
  slug: string;
  label: LocalizedText;
  sort_order: number;
  layout: CampaignTrackLayout;
  unlock_rule: CampaignTrackUnlockRule;
  is_system: boolean;
}

export function mapDbCampaignTrack(row: Record<string, unknown>): DbCampaignTrack {
  const labelRaw =
    row.label && typeof row.label === "object"
      ? (row.label as LocalizedText)
      : { fr: "", en: "" };
  const unlockRaw =
    row.unlock_rule && typeof row.unlock_rule === "object"
      ? (row.unlock_rule as CampaignTrackUnlockRule)
      : ({ type: "always" } as CampaignTrackUnlockRule);

  return {
    slug: String(row.slug),
    label: {
      fr: String(labelRaw.fr ?? row.slug),
      en: String(labelRaw.en ?? row.slug),
    },
    sort_order: Number(row.sort_order ?? 0),
    layout: row.layout === "main" ? "main" : "sequential",
    unlock_rule: unlockRaw,
    is_system: Boolean(row.is_system),
  };
}

export function trackLabel(track: DbCampaignTrack, lang: "fr" | "en"): string {
  return lang === "fr" ? track.label.fr || track.slug : track.label.en || track.slug;
}

export function isTrackUnlocked(
  track: DbCampaignTrack,
  playerElo: number,
  puzzles: (DbCampaignPuzzle & { completed: boolean })[]
): boolean {
  const rule = track.unlock_rule;
  if (!rule || rule.type === "always") return true;
  if (rule.type === "main_complete_or_elo") {
    return playerElo >= rule.min_elo || isMainCampaignComplete(puzzles);
  }
  if (rule.type === "prerequisite_track") {
    const prereq = puzzles.filter((p) => p.track === rule.track);
    if (prereq.length === 0) return true;
    if (rule.require_complete === false) return true;
    const standards = prereq.filter((p) => p.kind === "standard");
    const pool = standards.length > 0 ? standards : prereq;
    return pool.every((p) => p.completed);
  }
  return true;
}

type PuzzleWithCompletion = DbCampaignPuzzle & { completed: boolean };

/** Sequential lock within a track (all puzzle kinds on the path). */
export function computeTrackSequentialLocked(
  trackSlug: string,
  puzzles: PuzzleWithCompletion[],
  trackUnlocked: boolean
): Map<string, boolean> {
  const ordered = [...puzzles]
    .filter((p) => p.track === trackSlug)
    .sort((a, b) => a.sort_order - b.sort_order);

  const locked = new Map<string, boolean>();
  for (let i = 0; i < ordered.length; i++) {
    const puzzle = ordered[i]!;
    if (!trackUnlocked) {
      locked.set(puzzle.id, true);
      continue;
    }
    if (i === 0) {
      locked.set(puzzle.id, false);
      continue;
    }
    const prev = ordered[i - 1]!;
    locked.set(puzzle.id, !prev.completed);
  }
  return locked;
}

/** Main-track standard puzzles only — legacy path progression. */
export function computeMainStandardLocked(
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
    locked.set(puzzle.id, !standards[i - 1]!.completed);
  }
  return locked;
}

export function isPuzzleWithinPlanLimit(sortOrder: number, isPremium: boolean): boolean {
  if (isPremium) return true;
  return sortOrder <= ASCENSION_FREE_PUZZLES_PER_TRACK;
}

export function normalizeTrackSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
