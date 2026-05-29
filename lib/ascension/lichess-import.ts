import type { NormalizedLichessPuzzle } from "@/lib/lichess-puzzle";
import type { LocalizedText } from "@/lib/ascension/types";

/** Row shape inserted into `campaign_puzzles` (matches the admin POST payload, minus id). */
export interface CampaignPuzzleInsert {
  slug: string;
  kind: "standard";
  fen: string;
  solution_ucis: string[];
  fantasy_rules: Record<string, never>;
  prompt: LocalizedText;
  hints: LocalizedText[];
  insight: LocalizedText;
  min_elo: number;
  max_elo: number;
  xp_reward: number;
  elo_reward: number;
  sort_order: number;
  is_published: boolean;
}

/** Minimal shape needed to reason about which campaign levels are already taken. */
export interface CampaignLevelSlot {
  sort_order: number;
  is_published: boolean;
}

/** Stable, idempotent slug so re-imports of the same Lichess puzzle are deduplicated. */
export function lichessPuzzleSlug(puzzleId: string): string {
  return `lichess-${puzzleId}`;
}

/**
 * Bilingual prompt label per Lichess theme. The stored prompt is generated at import
 * time (server-side) since it is persisted in the DB, so the mapping lives here rather
 * than in the client i18n bundle.
 */
const THEME_LABELS: Record<string, LocalizedText> = {
  mateIn1: { fr: "Mat en 1 coup", en: "Mate in 1" },
  mateIn2: { fr: "Mat en 2 coups", en: "Mate in 2" },
  mateIn3: { fr: "Mat en 3 coups", en: "Mate in 3" },
  mateIn4: { fr: "Mat en 4 coups", en: "Mate in 4" },
  mateIn5: { fr: "Mat en 5 coups", en: "Mate in 5" },
  mate: { fr: "Trouvez le mat", en: "Find the mate" },
  fork: { fr: "Trouvez la fourchette", en: "Find the fork" },
  pin: { fr: "Exploitez le clouage", en: "Exploit the pin" },
  skewer: { fr: "Trouvez l'enfilade", en: "Find the skewer" },
  discoveredAttack: { fr: "Attaque à la découverte", en: "Discovered attack" },
  doubleCheck: { fr: "Trouvez l'échec double", en: "Find the double check" },
  sacrifice: { fr: "Trouvez le sacrifice", en: "Find the sacrifice" },
  deflection: { fr: "Déviez la défense", en: "Find the deflection" },
  attraction: { fr: "Trouvez l'attraction", en: "Find the attraction" },
  hangingPiece: { fr: "Gagnez la pièce en prise", en: "Win the hanging piece" },
  backRankMate: { fr: "Mat du couloir", en: "Back-rank mate" },
  promotion: { fr: "Exploitez la promotion", en: "Exploit the promotion" },
  trappedPiece: { fr: "Piégez la pièce", en: "Trap the piece" },
  endgame: { fr: "Trouvez le meilleur coup (finale)", en: "Find the best move (endgame)" },
  advantage: { fr: "Prenez l'avantage", en: "Win the advantage" },
  crushing: { fr: "Trouvez le coup décisif", en: "Find the crushing move" },
};

const DEFAULT_PROMPT: LocalizedText = {
  fr: "Trouvez le meilleur coup",
  en: "Find the best move",
};

/** Pick a bilingual prompt from the puzzle themes, preferring the most specific match. */
export function buildPromptFromThemes(themes: string[]): LocalizedText {
  for (const theme of themes) {
    const label = THEME_LABELS[theme];
    if (label) return label;
  }
  return DEFAULT_PROMPT;
}

/** Scale XP/ELO rewards with puzzle rating, bounded to a sane range. */
export function rewardForRating(rating: number): number {
  const safe = Number.isFinite(rating) ? rating : 0;
  const value = Math.round(10 + safe / 100);
  return Math.max(10, Math.min(40, value));
}

/** Source attribution + metadata, stored as the puzzle insight. */
export function buildInsight(p: NormalizedLichessPuzzle): LocalizedText {
  const themes = p.themes.length > 0 ? p.themes.join(", ") : "—";
  const url = `lichess.org/training/${p.puzzleId}`;
  return {
    fr: `Puzzle Lichess #${p.puzzleId} • Élo ${p.rating} • Thèmes : ${themes} • ${url}`,
    en: `Lichess puzzle #${p.puzzleId} • Rating ${p.rating} • Themes: ${themes} • ${url}`,
  };
}

/** Convert a normalized Lichess puzzle into a publishable campaign_puzzles row. */
export function lichessPuzzleToCampaignRow(
  p: NormalizedLichessPuzzle,
  sortOrder: number
): CampaignPuzzleInsert {
  const reward = rewardForRating(p.rating);
  return {
    slug: lichessPuzzleSlug(p.puzzleId),
    kind: "standard",
    fen: p.fen,
    solution_ucis: p.solutionUci.map((u) => u.trim().toLowerCase()),
    fantasy_rules: {},
    prompt: buildPromptFromThemes(p.themes),
    hints: [],
    insight: buildInsight(p),
    min_elo: 0,
    max_elo: 3000,
    xp_reward: reward,
    elo_reward: reward,
    sort_order: sortOrder,
    is_published: true,
  };
}

function occupiedLevels(existing: CampaignLevelSlot[]): Set<number> {
  const taken = new Set<number>();
  for (const slot of existing) {
    if (slot.is_published) taken.add(slot.sort_order);
  }
  return taken;
}

/** First campaign level (>= 1) without any published puzzle. */
export function nextFreeStandardLevel(existing: CampaignLevelSlot[]): number {
  const taken = occupiedLevels(existing);
  let level = 1;
  while (taken.has(level)) level++;
  return level;
}

/**
 * Assign each imported puzzle (already ordered by ascending difficulty) to the next
 * consecutive free level starting at `startLevel`, skipping levels that already hold a
 * published puzzle.
 */
export function assignTargetLevels<T>(
  existing: CampaignLevelSlot[],
  importedSorted: T[],
  startLevel: number
): Array<{ puzzle: T; level: number }> {
  const taken = occupiedLevels(existing);
  const result: Array<{ puzzle: T; level: number }> = [];
  let level = Math.max(1, Math.floor(startLevel));
  for (const puzzle of importedSorted) {
    while (taken.has(level)) level++;
    result.push({ puzzle, level });
    taken.add(level);
    level++;
  }
  return result;
}
