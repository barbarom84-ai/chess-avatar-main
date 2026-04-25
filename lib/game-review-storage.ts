import { supabase, isSupabaseConfigured } from "./supabase";
import type { GameReviewResult } from "./game-review";

/**
 * Look up a cached review by (user, pgn_hash, depth). Returns null when there
 * is no row, when Supabase is not configured, or on any error (cache miss is
 * never fatal — we just re-run Stockfish).
 */
export async function loadCachedReview(args: {
  userId: string;
  pgnHash: string;
  depth: number;
}): Promise<GameReviewResult | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("game_reviews")
      .select("result")
      .eq("user_id", args.userId)
      .eq("pgn_hash", args.pgnHash)
      .eq("depth", args.depth)
      .maybeSingle();
    if (error || !data) return null;
    return data.result as GameReviewResult;
  } catch {
    return null;
  }
}

/**
 * Persist a finished review for the current user. Best-effort: errors are
 * swallowed because the user already has the result in memory.
 */
export async function saveReview(args: {
  userId: string;
  pgnHash: string;
  depth: number;
  result: GameReviewResult;
}): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("game_reviews").upsert(
      {
        user_id: args.userId,
        pgn_hash: args.pgnHash,
        depth: args.depth,
        result: args.result,
      },
      { onConflict: "user_id,pgn_hash,depth" }
    );
  } catch {
    // best-effort
  }
}
