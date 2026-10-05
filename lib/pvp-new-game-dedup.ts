import type { SupabaseClient } from "@supabase/supabase-js";
import type { PvpGameRow } from "@/lib/pvp-chess";

/** Salon public en attente déjà créé par l'utilisateur (New game en différé). */
export async function findExistingOpenPvpLobby(
  sb: SupabaseClient,
  userId: string,
  timePreset: string
): Promise<PvpGameRow | null> {
  const { data, error } = await sb
    .from("pvp_games")
    .select("*")
    .eq("white_user_id", userId)
    .eq("status", "waiting")
    .is("black_user_id", null)
    .is("invited_user_id", null)
    .is("rematch_source_game_id", null)
    .eq("time_preset", timePreset)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as PvpGameRow;
}

const MATCHMAKING_DEDUP_MS = 20_000;

/**
 * Partie live tout juste créée via matchmaking (0 coup) — évite un second « New game » accidentel.
 * `timePreset` null = toutes cadences (poll de file dont la ligne a été consommée par l'appariement).
 */
export async function findRecentMatchmakingStarterGame(
  sb: SupabaseClient,
  userId: string,
  timePreset: string | null
): Promise<{ game: PvpGameRow; role: "white" | "black" } | null> {
  const since = new Date(Date.now() - MATCHMAKING_DEDUP_MS).toISOString();

  let query = sb.from("pvp_games").select("*").eq("status", "playing");
  if (timePreset) query = query.eq("time_preset", timePreset);
  const { data: rows, error } = await query
    .is("rematch_source_game_id", null)
    .is("invited_user_id", null)
    .or(`white_user_id.eq.${userId},black_user_id.eq.${userId}`)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !rows?.length) return null;

  for (const row of rows as PvpGameRow[]) {
    const { count } = await sb
      .from("pvp_moves")
      .select("id", { count: "exact", head: true })
      .eq("game_id", row.id);
    if ((count ?? 0) > 0) continue;

    const role = row.white_user_id === userId ? "white" : "black";
    if (row.black_user_id == null) continue;
    return { game: row, role };
  }

  return null;
}
