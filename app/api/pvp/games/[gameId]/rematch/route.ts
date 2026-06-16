import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { displayNameFromAuthUser } from "@/lib/pvp-display-name";
import { pvpRematchWantWhite } from "@/lib/pvp-access";
import { pvpRateLimitOrResponse } from "@/lib/pvp-api-rate-limit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Create a rematch lobby from a finished game (optional color swap). */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  const limited = await pvpRateLimitOrResponse(request, { windowMs: 60_000, max: 10 });
  if (limited) return limited;

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const { gameId } = await context.params;

  const body = (await request.json().catch(() => null)) as { swapColors?: boolean } | null;
  const swapColors = body?.swapColors !== false;

  const { data: existing, error: loadErr } = await sb
    .from("pvp_games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (loadErr || !existing) return jsonError("Game not found", 404);
  const game = existing as PvpGameRow;

  if (game.status !== "finished") return jsonError("Game is not finished", 400);
  if (!game.black_user_id) return jsonError("Invalid finished game", 400);

  const isWhite = game.white_user_id === user.id;
  const isBlack = game.black_user_id === user.id;
  if (!isWhite && !isBlack) return jsonError("Forbidden", 403);

  const opponentId = isWhite ? game.black_user_id : game.white_user_id;
  const opponentDisplayName = (
    isWhite ? game.black_display_name : game.white_display_name
  )?.trim() || "Player";

  const wantWhite = pvpRematchWantWhite(isWhite, swapColors);
  const callerName = displayNameFromAuthUser(user);

  const baseInsert = {
    created_by: user.id,
    status: "waiting" as const,
    time_preset: game.time_preset,
    clock_mode: game.clock_mode,
    clock_initial_sec: game.clock_initial_sec ?? 0,
    clock_increment_sec: game.clock_increment_sec ?? 0,
    white_remaining_ms: null,
    black_remaining_ms: null,
    clock_turn_started_at: null,
    result: null,
    result_reason: null,
    draw_offered_by: null,
  };

  const insertRow = wantWhite
    ? {
        ...baseInsert,
        white_user_id: user.id,
        black_user_id: null,
        white_display_name: callerName,
        black_display_name: null,
      }
    : {
        ...baseInsert,
        white_user_id: opponentId,
        black_user_id: user.id,
        white_display_name: opponentDisplayName,
        black_display_name: callerName,
      };

  const { data: created, error } = await sb
    .from("pvp_games")
    .insert(insertRow)
    .select(
      "id,status,white_user_id,black_user_id,created_at,time_preset,clock_mode,clock_initial_sec,clock_increment_sec,white_display_name,black_display_name"
    )
    .single();

  if (error || !created) {
    return jsonError(error?.message ?? "Failed to create rematch", 500);
  }

  const newId = created.id as string;
  const origin = request.headers.get("origin") ?? "";
  const inviteUrl = origin ? `${origin}/online?game=${newId}` : `/online?game=${newId}`;

  return NextResponse.json({
    gameId: newId,
    game: created,
    inviteUrl,
    role: wantWhite ? ("white" as const) : ("black" as const),
  });
}
