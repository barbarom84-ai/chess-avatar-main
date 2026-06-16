import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { undoLastPvpMove } from "@/lib/pvp-takeback-server";
import { canOfferPvpTakeback } from "@/lib/pvp-takeback";
import { replayGameFromUcis, type PvpMoveRow } from "@/lib/pvp-chess";
import { pvpRateLimitOrResponse } from "@/lib/pvp-api-rate-limit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type TakebackAction = "offer" | "accept" | "decline" | "cancel";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  const limited = await pvpRateLimitOrResponse(request, { windowMs: 60_000, max: 30 });
  if (limited) return limited;

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const { gameId } = await context.params;
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action as TakebackAction | undefined;
  if (
    action !== "offer" &&
    action !== "accept" &&
    action !== "decline" &&
    action !== "cancel"
  ) {
    return jsonError("Invalid action", 400);
  }

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

  const { count: moveCount, error: countErr } = await sb
    .from("pvp_moves")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId);

  if (countErr) return jsonError("Failed to load moves", 500);
  if ((moveCount ?? 0) < 1) return jsonError("No moves to take back", 400);

  if (action === "offer") {
    const { data: moveRows, error: movesErr } = await sb
      .from("pvp_moves")
      .select("ply,uci,played_by")
      .eq("game_id", gameId)
      .order("ply", { ascending: true });

    if (movesErr) return jsonError("Failed to load moves", 500);

    const sorted = (moveRows ?? []) as Pick<PvpMoveRow, "ply" | "uci" | "played_by">[];
    const chess = replayGameFromUcis(sorted.map((m) => m.uci));
    const role = isWhite ? ("white" as const) : ("black" as const);

    if (!canOfferPvpTakeback(user.id, role, sorted, chess)) {
      return jsonError("Takeback not allowed in this position", 400);
    }

    const { error } = await sb
      .from("pvp_games")
      .update({ takeback_offered_by: user.id, draw_offered_by: null })
      .eq("id", gameId)
      .eq("status", "playing");
    if (error) return jsonError(error.message ?? "Update failed", 500);
    return NextResponse.json({ ok: true, takebackOfferedBy: user.id });
  }

  if (action === "cancel") {
    if (row.takeback_offered_by !== user.id) return jsonError("No offer to cancel", 400);
    const { error } = await sb
      .from("pvp_games")
      .update({ takeback_offered_by: null })
      .eq("id", gameId);
    if (error) return jsonError(error.message ?? "Update failed", 500);
    return NextResponse.json({ ok: true, takebackOfferedBy: null });
  }

  if (action === "decline") {
    if (!row.takeback_offered_by || row.takeback_offered_by === user.id) {
      return jsonError("No opponent offer to decline", 400);
    }
    const { error } = await sb
      .from("pvp_games")
      .update({ takeback_offered_by: null })
      .eq("id", gameId);
    if (error) return jsonError(error.message ?? "Update failed", 500);
    return NextResponse.json({ ok: true, takebackOfferedBy: null });
  }

  if (!row.takeback_offered_by || row.takeback_offered_by === user.id) {
    return jsonError("No takeback offer to accept", 400);
  }

  const undo = await undoLastPvpMove(sb, gameId, row);
  if (!undo.ok) return jsonError(undo.error, 400);

  return NextResponse.json({
    ok: true,
    removedPly: undo.removedPly,
    game: undo.game,
  });
}
