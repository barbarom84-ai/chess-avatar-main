import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import { checkTimeoutForTimedGameWithMoves } from "@/lib/pvp-clock-server";
import { canAccessPvpGameAsSpectator } from "@/lib/pvp-access";
import { canUserCancelWaitingPvpGame } from "@/lib/pvp-game-cancel";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 180 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const { gameId } = await context.params;
  const { data: game, error: gErr } = await sb
    .from("pvp_games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (gErr || !game) return jsonError("Game not found", 404);

  let row = game as PvpGameRow;
  const isWhite = row.white_user_id === user.id;
  const isBlack = row.black_user_id === user.id;
  const isParticipant = isWhite || isBlack;
  const canJoin =
    row.status === "waiting" &&
    row.black_user_id == null &&
    row.white_user_id !== user.id;

  const canAcceptRematch =
    row.status === "waiting" &&
    row.black_user_id != null &&
    row.white_user_id === user.id;

  const canCancelLobby = canUserCancelWaitingPvpGame(user.id, row);

  const isSpectator = canAccessPvpGameAsSpectator(
    row.status,
    isParticipant,
    canJoin || canAcceptRematch
  );

  if (!isParticipant && !canJoin && !canAcceptRematch && !isSpectator) {
    return jsonError("Forbidden", 403);
  }

  let moves: PvpMoveRow[] = [];
  if (isParticipant || isSpectator) {
    const { data: mvs, error: mErr } = await sb
      .from("pvp_moves")
      .select("*")
      .eq("game_id", gameId)
      .order("ply", { ascending: true });
    if (!mErr && mvs) moves = mvs as PvpMoveRow[];
  }

  if (isParticipant && row.status === "playing") {
    const timeout = checkTimeoutForTimedGameWithMoves(row, moves, Date.now());
    if (timeout) {
      const { error: upErr } = await sb.from("pvp_games").update(timeout).eq("id", gameId);
      if (!upErr) {
        const { data: refreshed } = await sb.from("pvp_games").select("*").eq("id", gameId).single();
        if (refreshed) row = refreshed as PvpGameRow;
      }
    }
  }

  return NextResponse.json({
    game: row,
    moves,
    role: isWhite ? "white" : isBlack ? "black" : null,
    canJoin,
    canAcceptRematch,
    canCancelLobby,
    isSpectator,
    serverNow: Date.now(),
  });
}

/** Annule / supprime un salon encore en attente (hôte blanc uniquement, pas d’adversaire). */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const { gameId } = await context.params;

  const { data: game, error: gErr } = await sb
    .from("pvp_games")
    .select("id,white_user_id,status,black_user_id,created_by")
    .eq("id", gameId)
    .maybeSingle();

  if (gErr || !game) return jsonError("Game not found", 404);

  if (!canUserCancelWaitingPvpGame(user.id, game as PvpGameRow)) {
    return jsonError("Only the creator can cancel a waiting game", 403);
  }

  const { error: delErr } = await sb.from("pvp_games").delete().eq("id", gameId);
  if (delErr) return jsonError(delErr.message ?? "Delete failed", 500);

  return NextResponse.json({ ok: true });
}
