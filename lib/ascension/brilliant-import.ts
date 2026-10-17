import type { ReviewedMove } from "@/lib/game-review";
import {
  rewardForRating,
  type CampaignPuzzleInsert,
} from "@/lib/ascension/lichess-import";
import type { CampaignTrack, LocalizedText } from "@/lib/ascension/types";

const BRILLIANT_PROMPT: LocalizedText = {
  fr: "Trouvez le coup brillant",
  en: "Find the brilliant move",
};

/** Sanitize a fragment for use inside a campaign puzzle slug. */
export function slugifyFragment(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Stable, idempotent slug so re-imports of the same brilliant are deduplicated. */
export function brilliantPuzzleSlug(
  username: string,
  gameId: string,
  ply: number
): string {
  const user = slugifyFragment(username) || "player";
  const game = slugifyFragment(gameId) || "game";
  const safePly = Number.isFinite(ply) ? Math.max(0, Math.floor(ply)) : 0;
  return `chesscom-${user}-${game}-p${safePly}`;
}

export function playerSideFromUsernames(
  username: string,
  white: string,
  black: string
): "white" | "black" | null {
  const target = username.trim().toLowerCase();
  if (!target) return null;
  if (white.trim().toLowerCase() === target) return "white";
  if (black.trim().toLowerCase() === target) return "black";
  return null;
}

export interface BrilliantCandidate {
  ply: number;
  fen: string;
  uci: string;
  san: string;
}

/**
 * Keep only reviewed plies played by `playerSide` that were classified brilliant.
 * Requires matching FEN-before entries from the parsed game.
 */
export function collectBrilliantCandidates(
  moves: ReviewedMove[],
  fenBefore: string[],
  playerSide: "white" | "black"
): BrilliantCandidate[] {
  const out: BrilliantCandidate[] = [];
  for (const move of moves) {
    if (move.sideToMove !== playerSide) continue;
    if (move.classification !== "brilliant") continue;
    if (move.isBook) continue;
    const fen = fenBefore[move.ply];
    const uci = typeof move.uci === "string" ? move.uci.trim().toLowerCase() : "";
    if (!fen || !uci) continue;
    out.push({
      ply: move.ply,
      fen,
      uci,
      san: move.san,
    });
  }
  return out;
}

export interface BrilliantMoveToRowInput {
  fen: string;
  uci: string;
  gameId: string;
  ply: number;
  username: string;
  track: CampaignTrack;
  sortOrder: number;
  /** Optional Chess.com game URL for insight attribution. */
  gameUrl?: string;
  san?: string;
  /** Rough rating band for XP scaling (defaults to mid-range). */
  rating?: number;
}

export function buildBrilliantInsight(input: {
  username: string;
  gameId: string;
  ply: number;
  san?: string;
  gameUrl?: string;
}): LocalizedText {
  const user = input.username.trim() || "player";
  const moveLabel = input.san?.trim() ? ` (${input.san.trim()})` : "";
  const url =
    typeof input.gameUrl === "string" && input.gameUrl.trim()
      ? input.gameUrl.trim()
      : `chess.com game ${input.gameId}`;
  return {
    fr: `Coup brillant de ${user}${moveLabel} • ply ${input.ply} • ${url}`,
    en: `Brilliant move by ${user}${moveLabel} • ply ${input.ply} • ${url}`,
  };
}

/** Convert a detected brilliant into a publishable campaign_puzzles row. */
export function brilliantMoveToCampaignRow(
  input: BrilliantMoveToRowInput
): CampaignPuzzleInsert {
  const uci = input.uci.trim().toLowerCase();
  const reward = rewardForRating(input.rating ?? 1600);
  return {
    slug: brilliantPuzzleSlug(input.username, input.gameId, input.ply),
    kind: "standard",
    track: input.track,
    fen: input.fen,
    solution_ucis: [uci],
    fantasy_rules: {},
    prompt: BRILLIANT_PROMPT,
    hints: [],
    insight: buildBrilliantInsight({
      username: input.username,
      gameId: input.gameId,
      ply: input.ply,
      san: input.san,
      gameUrl: input.gameUrl,
    }),
    min_elo: 0,
    max_elo: 3000,
    xp_reward: reward,
    elo_reward: reward,
    sort_order: input.sortOrder,
    is_published: true,
  };
}
