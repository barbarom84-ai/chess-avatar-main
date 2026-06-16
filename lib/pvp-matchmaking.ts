import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import {
  isValidPvpTimePresetId,
  presetStorageInitialSec,
  resolvePvpTimePreset,
} from "@/lib/pvp-time-controls";
import { displayNameFromAuthUser } from "@/lib/pvp-display-name";
import { initialClockFieldsForPreset } from "@/lib/pvp-game-lifecycle";

export type PvpMatchmakingRow = {
  id: string;
  user_id: string;
  time_preset: string;
  display_name: string | null;
  created_at: string;
};

export function isMatchmakingEligiblePreset(presetId: string): boolean {
  if (!isValidPvpTimePresetId(presetId)) return false;
  return resolvePvpTimePreset(presetId).mode === "timed";
}

export async function upsertMatchmakingEntry(
  sb: SupabaseClient,
  user: Pick<User, "id" | "email" | "user_metadata">,
  timePreset: string
): Promise<PvpMatchmakingRow> {
  const displayName = displayNameFromAuthUser(user);

  await sb.from("pvp_matchmaking_queue").delete().eq("user_id", user.id);

  const { data, error } = await sb
    .from("pvp_matchmaking_queue")
    .insert({
      user_id: user.id,
      time_preset: timePreset,
      display_name: displayName,
    })
    .select("id,user_id,time_preset,display_name,created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to join queue");
  }

  return data as PvpMatchmakingRow;
}

export async function leaveMatchmakingQueue(
  sb: SupabaseClient,
  userId: string
): Promise<void> {
  await sb.from("pvp_matchmaking_queue").delete().eq("user_id", userId);
}

export type MatchmakingTryResult =
  | { status: "waiting"; queueSize: number }
  | { status: "matched"; gameId: string; role: "white" | "black" };

/** Tente d'apparier l'utilisateur avec un adversaire en file (FIFO par cadence). */
export async function tryMatchmakingPair(
  sb: SupabaseClient,
  user: Pick<User, "id" | "email" | "user_metadata">,
  selfEntry: PvpMatchmakingRow
): Promise<MatchmakingTryResult> {
  const { data: opponents, error: findErr } = await sb
    .from("pvp_matchmaking_queue")
    .select("id,user_id,time_preset,display_name,created_at")
    .eq("time_preset", selfEntry.time_preset)
    .neq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (findErr) throw new Error(findErr.message ?? "Matchmaking lookup failed");

  const opponent = (opponents?.[0] as PvpMatchmakingRow | undefined) ?? null;
  if (!opponent) {
    const { count } = await sb
      .from("pvp_matchmaking_queue")
      .select("id", { count: "exact", head: true })
      .eq("time_preset", selfEntry.time_preset);
    return { status: "waiting", queueSize: count ?? 1 };
  }

  const olderIsOpponent =
    new Date(opponent.created_at).getTime() <= new Date(selfEntry.created_at).getTime();
  const whiteEntry = olderIsOpponent ? opponent : selfEntry;
  const blackEntry = olderIsOpponent ? selfEntry : opponent;

  const { data: removedOpponent, error: delOppErr } = await sb
    .from("pvp_matchmaking_queue")
    .delete()
    .eq("id", opponent.id)
    .eq("user_id", opponent.user_id)
    .select("id")
    .maybeSingle();

  if (delOppErr || !removedOpponent) {
    const { count } = await sb
      .from("pvp_matchmaking_queue")
      .select("id", { count: "exact", head: true })
      .eq("time_preset", selfEntry.time_preset);
    return { status: "waiting", queueSize: count ?? 1 };
  }

  await sb.from("pvp_matchmaking_queue").delete().eq("user_id", user.id);

  const preset = resolvePvpTimePreset(selfEntry.time_preset);
  const nowIso = new Date().toISOString();
  const clocks = initialClockFieldsForPreset(preset, nowIso);

  const { data: game, error: gameErr } = await sb
    .from("pvp_games")
    .insert({
      created_by: whiteEntry.user_id,
      white_user_id: whiteEntry.user_id,
      black_user_id: blackEntry.user_id,
      status: "playing",
      white_display_name: whiteEntry.display_name?.trim() || "Player",
      black_display_name: blackEntry.display_name?.trim() || "Player",
      time_preset: preset.id,
      clock_mode: preset.mode,
      clock_initial_sec: presetStorageInitialSec(preset),
      clock_increment_sec: preset.incrementSec,
      result: null,
      result_reason: null,
      draw_offered_by: null,
      ...clocks,
    })
    .select("id")
    .single();

  if (gameErr || !game?.id) {
    throw new Error(gameErr?.message ?? "Failed to create matched game");
  }

  const role = user.id === whiteEntry.user_id ? ("white" as const) : ("black" as const);
  return { status: "matched", gameId: game.id as string, role };
}
