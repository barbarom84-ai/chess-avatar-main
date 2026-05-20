import { Chess } from "chess.js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import { replayGameFromUcis, normalizeUci } from "@/lib/pvp-chess";
import { applyUciMove } from "@/lib/learn-chess-utils";
import { applyMoveClockUpdate, checkTimeoutForTimedGame } from "@/lib/pvp-clock-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const { gameId } = await context.params;
  const body = (await request.json().catch(() => null)) as { uci?: string } | null;
  const uciRaw = body?.uci;
  const uci = typeof uciRaw === "string" ? normalizeUci(uciRaw) : null;
  if (!uci) return jsonError("Invalid UCI", 400);

  const { data: game, error: gErr } = await sb
    .from("pvp_games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (gErr || !game) return jsonError("Game not found", 404);
  const row = game as PvpGameRow;

  if (row.status !== "playing") return jsonError("Game is not active", 400);
  if (!row.black_user_id) return jsonError("Game not started", 400);

  const isWhite = row.white_user_id === user.id;
  const isBlack = row.black_user_id === user.id;
  if (!isWhite && !isBlack) return jsonError("Forbidden", 403);

  const { data: moveRows, error: mErr } = await sb
    .from("pvp_moves")
    .select("ply,uci,played_by")
    .eq("game_id", gameId)
    .order("ply", { ascending: true });

  if (mErr) return jsonError("Failed to load moves", 500);

  const sorted = (moveRows ?? []) as Pick<PvpMoveRow, "ply" | "uci" | "played_by">[];
  const ucis = sorted.map((r) => r.uci);
  const chess = replayGameFromUcis(ucis);

  const now = Date.now();
  const timeoutEarly = checkTimeoutForTimedGame(row, chess, now);
  if (timeoutEarly) {
    await sb.from("pvp_games").update(timeoutEarly).eq("id", gameId);
    return jsonError("Game over (time)", 400);
  }

  const expectedPly = ucis.length + 1;
  const stm = chess.turn();
  const expectWhite = stm === "w";
  if (expectWhite && !isWhite) return jsonError("Not your turn", 400);
  if (!expectWhite && !isBlack) return jsonError("Not your turn", 400);

  const clock = applyMoveClockUpdate(row, chess, now);
  if (clock.kind === "timeout") {
    await sb.from("pvp_games").update(clock.patch).eq("id", gameId);
    return jsonError("Time forfeiture", 400);
  }

  const next = new Chess(chess.fen());
  if (!applyUciMove(next, uci)) return jsonError("Illegal move", 400);

  const { data: insertedMove, error: insErr } = await sb
    .from("pvp_moves")
    .insert({
      game_id: gameId,
      ply: expectedPly,
      uci,
      played_by: user.id,
    })
    .select("id, game_id, ply, uci, played_by, created_at")
    .single();

  if (insErr) {
    if (insErr.code === "23505") return jsonError("Move already submitted", 409);
    return jsonError(insErr.message ?? "Insert failed", 500);
  }

  let result: string | null = row.result;
  let resultReason: string | null = row.result_reason;
  let newStatus: PvpGameRow["status"] = row.status;

  if (next.isCheckmate()) {
    const loser = next.turn();
    result = loser === "w" ? "0-1" : "1-0";
    resultReason = "checkmate";
    newStatus = "finished";
  } else if (next.isStalemate()) {
    result = "1/2-1/2";
    resultReason = "stalemate";
    newStatus = "finished";
  } else if (next.isThreefoldRepetition()) {
    result = "1/2-1/2";
    resultReason = "threefold_repetition";
    newStatus = "finished";
  } else if (next.isInsufficientMaterial()) {
    result = "1/2-1/2";
    resultReason = "insufficient_material";
    newStatus = "finished";
  } else if (next.isDrawByFiftyMoves()) {
    result = "1/2-1/2";
    resultReason = "fifty_move_rule";
    newStatus = "finished";
  }

  const ongoingClock: Record<string, unknown> = { draw_offered_by: null };
  if (row.clock_mode === "timed" && clock.kind === "tick") {
    ongoingClock.white_remaining_ms = clock.white_remaining_ms;
    ongoingClock.black_remaining_ms = clock.black_remaining_ms;
    ongoingClock.clock_turn_started_at = clock.clock_turn_started_at;
  }

  const gameUpdate = {
    status: newStatus,
    result,
    result_reason: resultReason,
    ...ongoingClock,
  };

  if (newStatus === "finished") {
    await sb.from("pvp_games").update(gameUpdate).eq("id", gameId);
  } else {
    await sb.from("pvp_games").update(ongoingClock).eq("id", gameId);
  }

  const gamePatch: Partial<PvpGameRow> = {
    status: newStatus,
    result,
    result_reason: resultReason,
    draw_offered_by: null,
  };
  if (row.clock_mode === "timed" && clock.kind === "tick") {
    gamePatch.white_remaining_ms = clock.white_remaining_ms;
    gamePatch.black_remaining_ms = clock.black_remaining_ms;
    gamePatch.clock_turn_started_at = clock.clock_turn_started_at;
  }

  return NextResponse.json({
    ok: true,
    ply: expectedPly,
    uci,
    move: insertedMove,
    game: gamePatch,
    gameOver: newStatus === "finished",
    result,
    resultReason,
  });
}
