import type { SupabaseClient } from "@supabase/supabase-js";
import type { PvpGameRow } from "@/lib/pvp-chess";

export type PvpRematchRole = "white" | "black";

export function pvpRoleInRematchGame(
  userId: string,
  game: Pick<PvpGameRow, "white_user_id" | "black_user_id">
): PvpRematchRole | null {
  if (game.white_user_id === userId) return "white";
  if (game.black_user_id === userId) return "black";
  return null;
}

/** Horloges au passage en `playing` pour une revanche (aligné sur join). */
export function pvpRematchStartClockPatch(
  game: Pick<PvpGameRow, "clock_mode" | "clock_initial_sec">
): {
  white_remaining_ms: number | null;
  black_remaining_ms: number | null;
  clock_turn_started_at: string | null;
} {
  if (game.clock_mode === "timed") {
    const initMs = Math.max(0, Number(game.clock_initial_sec ?? 0)) * 1000;
    const nowIso = new Date().toISOString();
    return {
      white_remaining_ms: initMs,
      black_remaining_ms: initMs,
      clock_turn_started_at: nowIso,
    };
  }
  if (game.clock_mode === "correspondence") {
    return {
      white_remaining_ms: null,
      black_remaining_ms: null,
      clock_turn_started_at: new Date().toISOString(),
    };
  }
  return {
    white_remaining_ms: null,
    black_remaining_ms: null,
    clock_turn_started_at: null,
  };
}

async function startRematchPlaying(
  sb: SupabaseClient,
  gameId: string,
  game: Pick<PvpGameRow, "clock_mode" | "clock_initial_sec">
): Promise<PvpGameRow | null> {
  const { data, error } = await sb
    .from("pvp_games")
    .update({
      status: "playing",
      ...pvpRematchStartClockPatch(game),
    })
    .eq("id", gameId)
    .eq("status", "waiting")
    .select("*")
    .maybeSingle();

  if (error || !data) return null;
  return data as PvpGameRow;
}

/**
 * Rattache le second joueur à une revanche existante ou démarre la partie si les deux camps sont déjà assignés.
 */
export async function resolveRematchForParticipant(
  sb: SupabaseClient,
  rematch: PvpGameRow,
  userId: string,
  userDisplayName: string
): Promise<{ game: PvpGameRow; role: PvpRematchRole } | null> {
  if (rematch.status === "playing") {
    const role = pvpRoleInRematchGame(userId, rematch);
    return role ? { game: rematch, role } : null;
  }

  if (rematch.status !== "waiting") return null;

  const role = pvpRoleInRematchGame(userId, rematch);
  const isWhite = role === "white";
  const isBlack = role === "black";

  if (rematch.black_user_id) {
    if (!isWhite && !isBlack) return null;

    if (isWhite) {
      const started = await startRematchPlaying(sb, rematch.id, rematch);
      if (!started) return null;
      return { game: started, role: "white" };
    }

    if (isBlack) {
      if (rematch.created_by === userId) {
        return { game: rematch, role: "black" };
      }
      const started = await startRematchPlaying(sb, rematch.id, rematch);
      if (!started) return null;
      return { game: started, role: "black" };
    }
  }

  if (isWhite) {
    return { game: rematch, role: "white" };
  }

  if (rematch.white_user_id === userId) {
    return null;
  }

  const { data: joined, error } = await sb
    .from("pvp_games")
    .update({
      black_user_id: userId,
      black_display_name: userDisplayName,
      status: "playing",
      ...pvpRematchStartClockPatch(rematch),
    })
    .eq("id", rematch.id)
    .eq("status", "waiting")
    .is("black_user_id", null)
    .neq("white_user_id", userId)
    .select("*")
    .maybeSingle();

  if (error || !joined) return null;
  return { game: joined as PvpGameRow, role: "black" };
}

export function isRematchUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export async function findActiveRematchForSource(
  sb: SupabaseClient,
  sourceGameId: string
): Promise<PvpGameRow | null> {
  const { data, error } = await sb
    .from("pvp_games")
    .select("*")
    .eq("rematch_source_game_id", sourceGameId)
    .in("status", ["waiting", "playing"])
    .maybeSingle();

  if (error || !data) return null;
  return data as PvpGameRow;
}
