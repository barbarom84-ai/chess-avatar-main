import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { displayNameFromAuthUser } from "@/lib/pvp-display-name";
import { pvpRateLimitOrResponse } from "@/lib/pvp-api-rate-limit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  const limited = await pvpRateLimitOrResponse(request, { windowMs: 60_000, max: 20 });
  if (limited) return limited;

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const { gameId } = await context.params;

  const { data: existing, error: loadErr } = await sb
    .from("pvp_games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (loadErr || !existing) return jsonError("Game not found", 404);
  const game = existing as PvpGameRow;

  if (game.status !== "waiting") {
    return jsonError("Cannot join this game", 400);
  }

  const isRematchAccept =
    game.black_user_id != null && game.white_user_id === user.id;

  if (isRematchAccept) {
    const patch: Record<string, unknown> = { status: "playing" };

    if (game.clock_mode === "timed") {
      const initMs = Math.max(0, Number(game.clock_initial_sec ?? 0)) * 1000;
      patch.white_remaining_ms = initMs;
      patch.black_remaining_ms = initMs;
      patch.clock_turn_started_at = new Date().toISOString();
    } else if (game.clock_mode === "correspondence") {
      patch.white_remaining_ms = null;
      patch.black_remaining_ms = null;
      patch.clock_turn_started_at = new Date().toISOString();
    } else {
      patch.white_remaining_ms = null;
      patch.black_remaining_ms = null;
      patch.clock_turn_started_at = null;
    }

    const { data: updated, error } = await sb
      .from("pvp_games")
      .update(patch)
      .eq("id", gameId)
      .eq("status", "waiting")
      .eq("white_user_id", user.id)
      .not("black_user_id", "is", null)
      .select(
        "id,status,white_user_id,black_user_id,time_preset,clock_mode,white_remaining_ms,black_remaining_ms,clock_turn_started_at,white_display_name,black_display_name"
      )
      .maybeSingle();

    if (error) return jsonError(error.message ?? "Join failed", 500);
    if (!updated) return jsonError("Cannot join this game", 400);

    return NextResponse.json({ game: updated, role: "white" as const });
  }

  if (game.black_user_id) {
    return jsonError("Cannot join this game", 400);
  }
  if (game.white_user_id === user.id) return jsonError("Cannot join this game", 400);

  const patch: Record<string, unknown> = {
    black_user_id: user.id,
    status: "playing",
    black_display_name: displayNameFromAuthUser(user),
  };

  if (game.clock_mode === "timed") {
    const initMs = Math.max(0, Number(game.clock_initial_sec ?? 0)) * 1000;
    patch.white_remaining_ms = initMs;
    patch.black_remaining_ms = initMs;
    patch.clock_turn_started_at = new Date().toISOString();
  } else if (game.clock_mode === "correspondence") {
    patch.white_remaining_ms = null;
    patch.black_remaining_ms = null;
    patch.clock_turn_started_at = new Date().toISOString();
  } else {
    patch.white_remaining_ms = null;
    patch.black_remaining_ms = null;
    patch.clock_turn_started_at = null;
  }

  const { data: updated, error } = await sb
    .from("pvp_games")
    .update(patch)
    .eq("id", gameId)
    .eq("status", "waiting")
    .is("black_user_id", null)
    .neq("white_user_id", user.id)
    .select(
      "id,status,white_user_id,black_user_id,time_preset,clock_mode,white_remaining_ms,black_remaining_ms,clock_turn_started_at,white_display_name,black_display_name"
    )
    .maybeSingle();

  if (error) return jsonError(error.message ?? "Join failed", 500);
  if (!updated) return jsonError("Cannot join this game", 400);

  return NextResponse.json({ game: updated, role: "black" as const });
}
